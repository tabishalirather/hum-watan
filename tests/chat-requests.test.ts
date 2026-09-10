import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendChatRequest } from '@/features/chat-requests/actions/send-chat-request';
import { reviewChatRequest } from '@/features/chat-requests/actions/review-chat-request';
import { cancelChatRequest } from '@/features/chat-requests/actions/cancel-chat-request';
import { db } from '@/db/client';
import { auditEvents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  createTestUser,
  createTestProfile,
  createTestChatRequest,
  getChatRequestById,
} from './fixtures';

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));
vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

describe('sendChatRequest', () => {
  let menteeUserId: string;
  let mentorUserId: string;

  beforeEach(async () => {
    const mentee = await createTestUser({ email: 'mentee@example.com' });
    menteeUserId = mentee.userId;
    await createTestProfile({ userId: menteeUserId, role: 'mentee' });

    const mentor = await createTestUser({ email: 'mentor@example.com' });
    mentorUserId = mentor.userId;
    await createTestProfile({ userId: mentorUserId, role: 'mentor', verified: true, visibleOnMap: true });

    mockAuth.mockResolvedValue({ user: { id: menteeUserId } });
  });

  it('should reject if user is not signed in', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await sendChatRequest({ mentorUserId });

    expect('error' in result && result.error).toContain('must be signed in');
  });

  it('should allow a mentor to send a request to another mentor', async () => {
    const { userId: requestingMentorId } = await createTestUser({ email: 'requesting-mentor@example.com' });
    await createTestProfile({ userId: requestingMentorId, role: 'mentor', verified: true });
    mockAuth.mockResolvedValue({ user: { id: requestingMentorId } });

    const result = await sendChatRequest({ mentorUserId });

    expect('success' in result && result.success).toBe(true);
  });

  it('should reject a sender with no profile', async () => {
    const { userId: noProfileId } = await createTestUser({ email: 'no-profile@example.com' });
    mockAuth.mockResolvedValue({ user: { id: noProfileId } });

    const result = await sendChatRequest({ mentorUserId });

    expect('error' in result && result.error).toContain('Complete your profile');
  });

  it('should reject a request to yourself', async () => {
    mockAuth.mockResolvedValue({ user: { id: mentorUserId } });

    const result = await sendChatRequest({ mentorUserId });

    expect('error' in result && result.error).toContain('yourself');
  });

  it('should reject an unverified mentor', async () => {
    const { userId: unverifiedMentorId } = await createTestUser({ email: 'unverified@example.com' });
    await createTestProfile({ userId: unverifiedMentorId, role: 'mentor', verified: false });

    const result = await sendChatRequest({ mentorUserId: unverifiedMentorId });

    expect('error' in result && result.error).toContain('not available');
  });

  it('should reject a mentor hidden from the map', async () => {
    const { userId: hiddenMentorId } = await createTestUser({ email: 'hidden@example.com' });
    await createTestProfile({
      userId: hiddenMentorId,
      role: 'mentor',
      verified: true,
      visibleOnMap: false,
    });

    const result = await sendChatRequest({ mentorUserId: hiddenMentorId });

    expect('error' in result && result.error).toContain('not available');
  });

  it('should reject a deactivated mentor', async () => {
    const { userId: inactiveMentorId } = await createTestUser({
      email: 'inactive@example.com',
      isActive: false,
    });
    await createTestProfile({ userId: inactiveMentorId, role: 'mentor', verified: true });

    const result = await sendChatRequest({ mentorUserId: inactiveMentorId });

    expect('error' in result && result.error).toContain('not available');
  });

  it('should create a pending request for a valid target', async () => {
    const result = await sendChatRequest({ mentorUserId, message: 'Hi there' });

    expect('success' in result && result.success).toBe(true);

    const rows = await db.query.chatRequests.findMany();
    const request = rows.find(
      (r) => r.requesterUserId === menteeUserId && r.recipientUserId === mentorUserId,
    );
    expect(request?.status).toBe('pending');
    expect(request?.message).toBe('Hi there');
  });

  it('should prevent a duplicate pending request to the same mentor', async () => {
    await createTestChatRequest({ requesterUserId: menteeUserId, recipientUserId: mentorUserId, status: 'pending' });

    const result = await sendChatRequest({ mentorUserId });

    expect('error' in result && result.error).toContain('pending request');
  });

  it('should prevent requesting a mentor already accepted', async () => {
    await createTestChatRequest({ requesterUserId: menteeUserId, recipientUserId: mentorUserId, status: 'accepted' });

    const result = await sendChatRequest({ mentorUserId });

    expect('error' in result && result.error).toContain('already connected');
  });

  it('should allow re-requesting after a rejection', async () => {
    await createTestChatRequest({ requesterUserId: menteeUserId, recipientUserId: mentorUserId, status: 'rejected' });

    const result = await sendChatRequest({ mentorUserId });

    expect('success' in result && result.success).toBe(true);
  });
});

describe('reviewChatRequest', () => {
  let menteeUserId: string;
  let mentorUserId: string;
  let requestId: string;

  beforeEach(async () => {
    const mentee = await createTestUser({ email: 'mentee2@example.com' });
    menteeUserId = mentee.userId;
    await createTestProfile({ userId: menteeUserId, role: 'mentee' });

    const mentor = await createTestUser({ email: 'mentor2@example.com' });
    mentorUserId = mentor.userId;
    await createTestProfile({ userId: mentorUserId, role: 'mentor', verified: true });

    const request = await createTestChatRequest({ requesterUserId: menteeUserId, recipientUserId: mentorUserId, status: 'pending' });
    requestId = request.id;

    mockAuth.mockResolvedValue({ user: { id: mentorUserId } });
  });

  it('should reject if user is not signed in', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await reviewChatRequest(requestId, 'accepted');

    expect('error' in result && result.error).toContain('must be signed in');
  });

  it('should reject review by someone other than the target mentor', async () => {
    const { userId: otherUserId } = await createTestUser({ email: 'other@example.com' });
    mockAuth.mockResolvedValue({ user: { id: otherUserId } });

    const result = await reviewChatRequest(requestId, 'accepted');

    expect('error' in result && result.error).toContain('no longer pending');

    const request = await getChatRequestById(requestId);
    expect(request?.status).toBe('pending');
  });

  it('should let the mentor accept a pending request', async () => {
    const result = await reviewChatRequest(requestId, 'accepted');

    expect('success' in result && result.success).toBe(true);

    const request = await getChatRequestById(requestId);
    expect(request?.status).toBe('accepted');
    expect(request?.reviewedAt).toBeDefined();

    const audit = await db.query.auditEvents.findFirst({
      where: and(eq(auditEvents.entityId, requestId), eq(auditEvents.action, 'chat_request_accepted')),
    });
    expect(audit).toBeDefined();
    expect(audit?.actorUserId).toBe(mentorUserId);
  });

  it('should let the mentor reject a pending request', async () => {
    const result = await reviewChatRequest(requestId, 'rejected');

    expect('success' in result && result.success).toBe(true);

    const request = await getChatRequestById(requestId);
    expect(request?.status).toBe('rejected');
  });

  it('should prevent double review', async () => {
    await reviewChatRequest(requestId, 'accepted');
    const result = await reviewChatRequest(requestId, 'rejected');

    expect('error' in result && result.error).toContain('no longer pending');

    const request = await getChatRequestById(requestId);
    expect(request?.status).toBe('accepted');
  });
});

describe('cancelChatRequest', () => {
  let menteeUserId: string;
  let mentorUserId: string;
  let requestId: string;

  beforeEach(async () => {
    const mentee = await createTestUser({ email: 'mentee3@example.com' });
    menteeUserId = mentee.userId;
    await createTestProfile({ userId: menteeUserId, role: 'mentee' });

    const mentor = await createTestUser({ email: 'mentor3@example.com' });
    mentorUserId = mentor.userId;
    await createTestProfile({ userId: mentorUserId, role: 'mentor', verified: true });

    const request = await createTestChatRequest({ requesterUserId: menteeUserId, recipientUserId: mentorUserId, status: 'pending' });
    requestId = request.id;

    mockAuth.mockResolvedValue({ user: { id: menteeUserId } });
  });

  it('should let the mentee cancel their own pending request', async () => {
    const result = await cancelChatRequest(requestId);

    expect('success' in result && result.success).toBe(true);

    const request = await getChatRequestById(requestId);
    expect(request?.status).toBe('cancelled');
  });

  it('should prevent cancelling someone else\'s request', async () => {
    const { userId: otherMenteeId } = await createTestUser({ email: 'other-mentee@example.com' });
    mockAuth.mockResolvedValue({ user: { id: otherMenteeId } });

    const result = await cancelChatRequest(requestId);

    expect('error' in result && result.error).toContain('no longer pending');

    const request = await getChatRequestById(requestId);
    expect(request?.status).toBe('pending');
  });
});
