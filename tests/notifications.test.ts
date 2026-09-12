import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { chatRequests, userBlocks } from '@/db/schema';
import { getNotifications } from '@/features/notifications/queries/get-notifications';
import {
  createTestChatRequest,
  createTestMentorReferral,
  createTestMessage,
  createTestProfile,
  createTestUser,
} from './fixtures';

const PAST = new Date(Date.now() - 60 * 60 * 1000);

async function acceptRequest(requestId: string, reviewedAt: Date) {
  await db
    .update(chatRequests)
    .set({ status: 'accepted', reviewedAt })
    .where(eq(chatRequests.id, requestId));
}

describe('getNotifications', () => {
  let menteeUserId: string;
  let mentorUserId: string;

  beforeEach(async () => {
    const mentee = await createTestUser({ email: 'notif-mentee@example.com', name: 'Mina Mentee' });
    menteeUserId = mentee.userId;
    await createTestProfile({ userId: menteeUserId, role: 'mentee', connectionsViewedAt: PAST });

    const mentor = await createTestUser({ email: 'notif-mentor@example.com', name: 'Mo Mentor' });
    mentorUserId = mentor.userId;
    await createTestProfile({
      userId: mentorUserId,
      role: 'mentor',
      verified: true,
      connectionsViewedAt: PAST,
    });
  });

  it('returns an empty payload for a user with no activity', async () => {
    const result = await getNotifications(mentorUserId);

    expect(result.total).toBe(0);
    expect(result.items).toHaveLength(0);
    expect(result.counts).toEqual({ messages: 0, requests: 0, connections: 0, verifications: 0 });
  });

  it('returns an empty payload for a user with no profile', async () => {
    const { userId } = await createTestUser({ email: 'no-profile@example.com' });

    const result = await getNotifications(userId);

    expect(result.total).toBe(0);
  });

  it('surfaces a pending contact request to the recipient only', async () => {
    await createTestChatRequest({
      requesterUserId: menteeUserId,
      recipientUserId: mentorUserId,
      status: 'pending',
      message: 'Hoping for advice on my SOP',
    });

    const forMentor = await getNotifications(mentorUserId);
    expect(forMentor.counts.requests).toBe(1);
    expect(forMentor.items[0].category).toBe('requests');
    expect(forMentor.items[0].title).toBe('Mina Mentee');
    expect(forMentor.items[0].body).toContain('SOP');

    const forMentee = await getNotifications(menteeUserId);
    expect(forMentee.counts.requests).toBe(0);
  });

  it('falls back to default copy when a request carries no message', async () => {
    await createTestChatRequest({
      requesterUserId: menteeUserId,
      recipientUserId: mentorUserId,
      status: 'pending',
    });

    const result = await getNotifications(mentorUserId);

    expect(result.items[0].body).toBe('Sent you a contact request.');
  });

  it('ignores requests that are no longer pending', async () => {
    await createTestChatRequest({
      requesterUserId: menteeUserId,
      recipientUserId: mentorUserId,
      status: 'rejected',
    });

    const result = await getNotifications(mentorUserId);

    expect(result.counts.requests).toBe(0);
  });

  it('groups unread messages into one notification per thread', async () => {
    const request = await createTestChatRequest({
      requesterUserId: menteeUserId,
      recipientUserId: mentorUserId,
      status: 'accepted',
    });
    await acceptRequest(request.id, PAST);
    await createTestMessage({ chatRequestId: request.id, senderId: menteeUserId, body: 'First' });
    await createTestMessage({ chatRequestId: request.id, senderId: menteeUserId, body: 'Second' });

    const result = await getNotifications(mentorUserId);

    expect(result.counts.messages).toBe(1);
    expect(result.total).toBe(1);
    expect(result.items[0].count).toBe(2);
    expect(result.items[0].href).toBe(`/connections/${request.id}`);
  });

  it('never notifies a sender about their own message, and skips read ones', async () => {
    const request = await createTestChatRequest({
      requesterUserId: menteeUserId,
      recipientUserId: mentorUserId,
      status: 'accepted',
    });
    await acceptRequest(request.id, PAST);
    await createTestMessage({ chatRequestId: request.id, senderId: menteeUserId, body: 'Unread' });
    await createTestMessage({
      chatRequestId: request.id,
      senderId: menteeUserId,
      body: 'Already read',
      readAt: new Date(),
    });

    const forSender = await getNotifications(menteeUserId);
    expect(forSender.counts.messages).toBe(0);

    const forRecipient = await getNotifications(mentorUserId);
    expect(forRecipient.counts.messages).toBe(1);
    expect(forRecipient.items[0].count).toBe(1);
  });

  it('reports a newly accepted connection to both sides', async () => {
    const request = await createTestChatRequest({
      requesterUserId: menteeUserId,
      recipientUserId: mentorUserId,
      status: 'pending',
    });
    await acceptRequest(request.id, new Date());

    const forMentee = await getNotifications(menteeUserId);
    expect(forMentee.counts.connections).toBe(1);
    expect(forMentee.items[0].title).toBe('Mo Mentor');
    expect(forMentee.items[0].body).toContain('Accepted your contact request');

    const forMentor = await getNotifications(mentorUserId);
    expect(forMentor.counts.connections).toBe(1);
    expect(forMentor.items[0].title).toBe('Mina Mentee');
  });

  it('drops a connection once the viewer has opened Connections since it was accepted', async () => {
    const request = await createTestChatRequest({
      requesterUserId: menteeUserId,
      recipientUserId: mentorUserId,
      status: 'pending',
    });
    await acceptRequest(request.id, PAST);

    const result = await getNotifications(menteeUserId);

    expect(result.counts.connections).toBe(0);
  });

  it('does not double-count a connection that already has messages', async () => {
    const request = await createTestChatRequest({
      requesterUserId: menteeUserId,
      recipientUserId: mentorUserId,
      status: 'pending',
    });
    await acceptRequest(request.id, new Date());
    await createTestMessage({ chatRequestId: request.id, senderId: menteeUserId, body: 'Hello' });

    const result = await getNotifications(mentorUserId);

    expect(result.counts.connections).toBe(0);
    expect(result.counts.messages).toBe(1);
    expect(result.total).toBe(1);
  });

  it('shows pending mentor referrals to a verified mentor referee', async () => {
    const { userId: candidateId } = await createTestUser({
      email: 'candidate@example.com',
      name: 'Cara Candidate',
    });
    await createTestProfile({ userId: candidateId, role: 'mentor', verified: false });
    await createTestMentorReferral({
      mentorUserId: candidateId,
      refereeUserId: mentorUserId,
      status: 'pending',
    });

    const result = await getNotifications(mentorUserId);

    expect(result.counts.verifications).toBe(1);
    expect(result.items[0].title).toBe('Cara Candidate');
    expect(result.items[0].href).toBe('/requests');
  });

  it('hides referrals from a referee who cannot act on them', async () => {
    const { userId: unverifiedId } = await createTestUser({ email: 'unverified@example.com' });
    await createTestProfile({ userId: unverifiedId, role: 'mentor', verified: false });
    const { userId: candidateId } = await createTestUser({ email: 'candidate2@example.com' });
    await createTestProfile({ userId: candidateId, role: 'mentor', verified: false });
    await createTestMentorReferral({
      mentorUserId: candidateId,
      refereeUserId: unverifiedId,
      status: 'pending',
    });

    const result = await getNotifications(unverifiedId);

    expect(result.counts.verifications).toBe(0);
  });

  it('treats an admin as able to review referrals', async () => {
    const { userId: adminId } = await createTestUser({ email: 'admin@university.example' });
    await createTestProfile({ userId: adminId, role: 'admin', verified: false });
    const { userId: candidateId } = await createTestUser({ email: 'candidate3@example.com' });
    await createTestProfile({ userId: candidateId, role: 'mentor', verified: false });
    await createTestMentorReferral({
      mentorUserId: candidateId,
      refereeUserId: adminId,
      status: 'pending',
    });

    const result = await getNotifications(adminId);

    expect(result.counts.verifications).toBe(1);
  });

  it('excludes activity from a blocked user in both directions', async () => {
    const request = await createTestChatRequest({
      requesterUserId: menteeUserId,
      recipientUserId: mentorUserId,
      status: 'accepted',
    });
    await acceptRequest(request.id, PAST);
    await createTestMessage({ chatRequestId: request.id, senderId: menteeUserId, body: 'Hello' });
    await createTestChatRequest({
      requesterUserId: menteeUserId,
      recipientUserId: mentorUserId,
      status: 'pending',
    });

    expect((await getNotifications(mentorUserId)).total).toBe(2);

    await db
      .insert(userBlocks)
      .values({ blockerUserId: mentorUserId, blockedUserId: menteeUserId });

    const result = await getNotifications(mentorUserId);
    expect(result.total).toBe(0);
  });

  it('keeps total equal to the sum of its categories and sorts newest first', async () => {
    const { userId: candidateId } = await createTestUser({ email: 'candidate4@example.com' });
    await createTestProfile({ userId: candidateId, role: 'mentor', verified: false });
    await createTestMentorReferral({
      mentorUserId: candidateId,
      refereeUserId: mentorUserId,
      status: 'pending',
    });

    const messaged = await createTestChatRequest({
      requesterUserId: menteeUserId,
      recipientUserId: mentorUserId,
      status: 'accepted',
    });
    await acceptRequest(messaged.id, PAST);
    await createTestMessage({ chatRequestId: messaged.id, senderId: menteeUserId, body: 'Hi' });

    const { userId: otherMenteeId } = await createTestUser({ email: 'other-mentee@example.com' });
    await createTestProfile({ userId: otherMenteeId, role: 'mentee' });
    await createTestChatRequest({
      requesterUserId: otherMenteeId,
      recipientUserId: mentorUserId,
      status: 'pending',
    });

    const result = await getNotifications(mentorUserId);

    const summed =
      result.counts.messages +
      result.counts.requests +
      result.counts.connections +
      result.counts.verifications;
    expect(result.total).toBe(summed);
    expect(result.items).toHaveLength(summed);

    const timestamps = result.items.map((item) => new Date(item.createdAt).getTime());
    expect([...timestamps].sort((a, b) => b - a)).toEqual(timestamps);
  });
});
