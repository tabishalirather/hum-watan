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

async function resolveRequest(requestId: string, status: 'accepted' | 'rejected', reviewedAt: Date) {
  await db.update(chatRequests).set({ status, reviewedAt }).where(eq(chatRequests.id, requestId));
}

describe('getNotifications', () => {
  let menteeUserId: string;
  let mentorUserId: string;

  beforeEach(async () => {
    const mentee = await createTestUser({ email: 'notif-mentee@example.com', name: 'Mina Mentee' });
    menteeUserId = mentee.userId;
    await createTestProfile({
      userId: menteeUserId,
      role: 'mentee',
      connectionsViewedAt: PAST,
      verificationsViewedAt: PAST,
    });

    const mentor = await createTestUser({ email: 'notif-mentor@example.com', name: 'Mo Mentor' });
    mentorUserId = mentor.userId;
    await createTestProfile({
      userId: mentorUserId,
      role: 'mentor',
      verified: true,
      connectionsViewedAt: PAST,
      verificationsViewedAt: PAST,
    });
  });

  it('returns an empty payload for a user with no activity', async () => {
    const result = await getNotifications(mentorUserId);

    expect(result.total).toBe(0);
    expect(result.items).toHaveLength(0);
    expect(result.counts).toEqual({ messages: 0, connections: 0, verifications: 0 });
  });

  it('returns an empty payload for a user with no profile', async () => {
    const { userId } = await createTestUser({ email: 'no-profile@example.com' });

    expect((await getNotifications(userId)).total).toBe(0);
  });

  describe('connections', () => {
    it('surfaces an incoming contact request to the recipient only, flagged as action needed', async () => {
      await createTestChatRequest({
        requesterUserId: menteeUserId,
        recipientUserId: mentorUserId,
        status: 'pending',
        message: 'Hoping for advice on my SOP',
      });

      const forMentor = await getNotifications(mentorUserId);
      expect(forMentor.counts.connections).toBe(1);
      expect(forMentor.items[0].category).toBe('connections');
      expect(forMentor.items[0].title).toBe('Mina Mentee');
      expect(forMentor.items[0].body).toContain('SOP');
      expect(forMentor.items[0].actionRequired).toBe(true);

      expect((await getNotifications(menteeUserId)).counts.connections).toBe(0);
    });

    it('falls back to default copy when a request carries no message', async () => {
      await createTestChatRequest({
        requesterUserId: menteeUserId,
        recipientUserId: mentorUserId,
        status: 'pending',
      });

      expect((await getNotifications(mentorUserId)).items[0].body).toBe('Wants to connect with you.');
    });

    it('reports an acceptance to both sides', async () => {
      const request = await createTestChatRequest({
        requesterUserId: menteeUserId,
        recipientUserId: mentorUserId,
        status: 'pending',
      });
      await resolveRequest(request.id, 'accepted', new Date());

      const forMentee = await getNotifications(menteeUserId);
      expect(forMentee.counts.connections).toBe(1);
      expect(forMentee.items[0].title).toBe('Mo Mentor');
      expect(forMentee.items[0].body).toContain('Accepted your contact request');
      expect(forMentee.items[0].actionRequired).toBeUndefined();

      expect((await getNotifications(mentorUserId)).counts.connections).toBe(1);
    });

    it('reports a rejection to the requester and never to the person who rejected', async () => {
      const request = await createTestChatRequest({
        requesterUserId: menteeUserId,
        recipientUserId: mentorUserId,
        status: 'pending',
      });
      await resolveRequest(request.id, 'rejected', new Date());

      const forMentee = await getNotifications(menteeUserId);
      expect(forMentee.counts.connections).toBe(1);
      expect(forMentee.items[0].body).toContain('Declined your contact request');

      expect((await getNotifications(mentorUserId)).counts.connections).toBe(0);
    });

    it('ignores a cancelled request entirely', async () => {
      const request = await createTestChatRequest({
        requesterUserId: menteeUserId,
        recipientUserId: mentorUserId,
        status: 'pending',
      });
      await db
        .update(chatRequests)
        .set({ status: 'cancelled', reviewedAt: new Date() })
        .where(eq(chatRequests.id, request.id));

      expect((await getNotifications(mentorUserId)).counts.connections).toBe(0);
      expect((await getNotifications(menteeUserId)).counts.connections).toBe(0);
    });

    it('drops an outcome once the viewer has opened Connections since it happened', async () => {
      const request = await createTestChatRequest({
        requesterUserId: menteeUserId,
        recipientUserId: mentorUserId,
        status: 'pending',
      });
      await resolveRequest(request.id, 'accepted', PAST);

      expect((await getNotifications(menteeUserId)).counts.connections).toBe(0);
    });

    it('does not double-count an acceptance that already has messages', async () => {
      const request = await createTestChatRequest({
        requesterUserId: menteeUserId,
        recipientUserId: mentorUserId,
        status: 'pending',
      });
      await resolveRequest(request.id, 'accepted', new Date());
      await createTestMessage({ chatRequestId: request.id, senderId: menteeUserId, body: 'Hello' });

      const result = await getNotifications(mentorUserId);
      expect(result.counts.connections).toBe(0);
      expect(result.counts.messages).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  describe('messages', () => {
    it('groups unread messages into one notification per thread', async () => {
      const request = await createTestChatRequest({
        requesterUserId: menteeUserId,
        recipientUserId: mentorUserId,
        status: 'accepted',
      });
      await resolveRequest(request.id, 'accepted', PAST);
      await createTestMessage({ chatRequestId: request.id, senderId: menteeUserId, body: 'First' });
      await createTestMessage({ chatRequestId: request.id, senderId: menteeUserId, body: 'Second' });

      const result = await getNotifications(mentorUserId);
      expect(result.counts.messages).toBe(1);
      expect(result.items[0].count).toBe(2);
      expect(result.items[0].href).toBe(`/connections/${request.id}`);
    });

    it('never notifies a sender about their own message, and skips read ones', async () => {
      const request = await createTestChatRequest({
        requesterUserId: menteeUserId,
        recipientUserId: mentorUserId,
        status: 'accepted',
      });
      await resolveRequest(request.id, 'accepted', PAST);
      await createTestMessage({ chatRequestId: request.id, senderId: menteeUserId, body: 'Unread' });
      await createTestMessage({
        chatRequestId: request.id,
        senderId: menteeUserId,
        body: 'Read',
        readAt: new Date(),
      });

      expect((await getNotifications(menteeUserId)).counts.messages).toBe(0);

      const forMentor = await getNotifications(mentorUserId);
      expect(forMentor.counts.messages).toBe(1);
      expect(forMentor.items[0].count).toBe(1);
    });
  });

  describe('verifications', () => {
    it('shows a pending referral to a referee who can act on it, flagged as action needed', async () => {
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
      expect(result.items[0].actionRequired).toBe(true);
    });

    it('hides a pending referral from a referee who cannot act on it', async () => {
      const { userId: unverifiedId } = await createTestUser({ email: 'unverified@example.com' });
      await createTestProfile({ userId: unverifiedId, role: 'mentor', verified: false });
      const { userId: candidateId } = await createTestUser({ email: 'candidate2@example.com' });
      await createTestProfile({ userId: candidateId, role: 'mentor', verified: false });
      await createTestMentorReferral({
        mentorUserId: candidateId,
        refereeUserId: unverifiedId,
        status: 'pending',
      });

      expect((await getNotifications(unverifiedId)).counts.verifications).toBe(0);
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

      expect((await getNotifications(adminId)).counts.verifications).toBe(1);
    });

    it('tells a mentor their own nomination was approved', async () => {
      const { userId: candidateId } = await createTestUser({ email: 'approved@example.com' });
      await createTestProfile({
        userId: candidateId,
        role: 'mentor',
        verified: true,
        verificationsViewedAt: PAST,
      });
      await createTestMentorReferral({
        mentorUserId: candidateId,
        refereeUserId: mentorUserId,
        status: 'confirmed',
        reviewedAt: new Date(),
      });

      const result = await getNotifications(candidateId);
      expect(result.counts.verifications).toBe(1);
      expect(result.items[0].title).toBe('Mentor verification approved');
      expect(result.items[0].href).toBe('/profile');
    });

    it('tells a rejected mentor, who can never reach /requests to clear it', async () => {
      const { userId: candidateId } = await createTestUser({ email: 'declined@example.com' });
      await createTestProfile({
        userId: candidateId,
        role: 'mentor',
        verified: false,
        verificationsViewedAt: PAST,
      });
      await createTestMentorReferral({
        mentorUserId: candidateId,
        refereeUserId: mentorUserId,
        refereeEmail: 'notif-mentor@example.com',
        status: 'rejected',
        reviewedAt: new Date(),
      });

      const result = await getNotifications(candidateId);
      expect(result.counts.verifications).toBe(1);
      expect(result.items[0].title).toBe('Mentor verification declined');
      expect(result.items[0].body).toContain('notif-mentor@example.com');
      expect(result.items[0].href).toBe('/profile');
    });

    it('drops the outcome once the mentor has visited their profile since', async () => {
      const { userId: candidateId } = await createTestUser({ email: 'seen@example.com' });
      await createTestProfile({
        userId: candidateId,
        role: 'mentor',
        verified: true,
        verificationsViewedAt: new Date(),
      });
      await createTestMentorReferral({
        mentorUserId: candidateId,
        refereeUserId: mentorUserId,
        status: 'confirmed',
        reviewedAt: PAST,
      });

      expect((await getNotifications(candidateId)).counts.verifications).toBe(0);
    });

    it('keeps the connections watermark from clearing a verification outcome', async () => {
      const { userId: candidateId } = await createTestUser({ email: 'separate@example.com' });
      await createTestProfile({
        userId: candidateId,
        role: 'mentor',
        verified: true,
        connectionsViewedAt: new Date(),
        verificationsViewedAt: PAST,
      });
      await createTestMentorReferral({
        mentorUserId: candidateId,
        refereeUserId: mentorUserId,
        status: 'confirmed',
        reviewedAt: new Date(),
      });

      expect((await getNotifications(candidateId)).counts.verifications).toBe(1);
    });

    it('ignores a nomination that is still pending from the mentor side', async () => {
      const { userId: candidateId } = await createTestUser({ email: 'waiting@example.com' });
      await createTestProfile({
        userId: candidateId,
        role: 'mentor',
        verified: false,
        verificationsViewedAt: PAST,
      });
      await createTestMentorReferral({
        mentorUserId: candidateId,
        refereeUserId: mentorUserId,
        status: 'pending',
      });

      expect((await getNotifications(candidateId)).counts.verifications).toBe(0);
    });
  });

  it('excludes activity from a blocked user in both directions', async () => {
    const request = await createTestChatRequest({
      requesterUserId: menteeUserId,
      recipientUserId: mentorUserId,
      status: 'accepted',
    });
    await resolveRequest(request.id, 'accepted', PAST);
    await createTestMessage({ chatRequestId: request.id, senderId: menteeUserId, body: 'Hello' });
    await createTestChatRequest({
      requesterUserId: menteeUserId,
      recipientUserId: mentorUserId,
      status: 'pending',
    });

    expect((await getNotifications(mentorUserId)).total).toBe(2);

    await db.insert(userBlocks).values({ blockerUserId: mentorUserId, blockedUserId: menteeUserId });

    expect((await getNotifications(mentorUserId)).total).toBe(0);
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
    await resolveRequest(messaged.id, 'accepted', PAST);
    await createTestMessage({ chatRequestId: messaged.id, senderId: menteeUserId, body: 'Hi' });

    const { userId: otherMenteeId } = await createTestUser({ email: 'other-mentee@example.com' });
    await createTestProfile({ userId: otherMenteeId, role: 'mentee' });
    await createTestChatRequest({
      requesterUserId: otherMenteeId,
      recipientUserId: mentorUserId,
      status: 'pending',
    });

    const result = await getNotifications(mentorUserId);

    const summed = result.counts.messages + result.counts.connections + result.counts.verifications;
    expect(result.total).toBe(summed);
    expect(result.items).toHaveLength(summed);

    const timestamps = result.items.map((item) => new Date(item.createdAt).getTime());
    expect([...timestamps].sort((a, b) => b - a)).toEqual(timestamps);
  });
});
