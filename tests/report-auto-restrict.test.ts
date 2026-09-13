import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { auditEvents, chatRequests, profiles, reports } from '@/db/schema';
import { reportUser } from '@/features/moderation/actions/report-user';
import { reviewReport, setUserRestricted } from '@/features/admin/actions/admin-actions';
import { sendChatRequest } from '@/features/chat-requests/actions/send-chat-request';
import { sendMessage } from '@/features/messages/actions/send-message';
import {
  REPORT_RESTRICTION_THRESHOLD,
  RESTRICTED_SENDER_ERROR,
} from '@/features/moderation/lib/restriction';
import {
  createTestChatRequest,
  createTestProfile,
  createTestUser,
  getProfileByUserId,
} from './fixtures';

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mockAuth }));

/** Files one report from a fresh reporter, as a real user would. */
async function reportFrom(email: string, reportedUserId: string) {
  const { userId } = await createTestUser({ email });
  await createTestProfile({ userId, role: 'mentee' });
  mockAuth.mockResolvedValue({ user: { id: userId } });
  return reportUser({ reportedUserId, reason: 'harassment' });
}

describe('automatic restriction after repeated reports', () => {
  let offenderUserId: string;

  beforeEach(async () => {
    const offender = await createTestUser({ email: 'auto-offender@example.com' });
    offenderUserId = offender.userId;
    await createTestProfile({ userId: offenderUserId, role: 'mentor', verified: true, visibleOnMap: true });
  });

  it('leaves an account alone below the threshold', async () => {
    await reportFrom('ar1@example.com', offenderUserId);
    await reportFrom('ar2@example.com', offenderUserId);

    expect((await getProfileByUserId(offenderUserId))?.restrictedAt).toBeNull();
  });

  it('restricts on the third report and records an audit event', async () => {
    await reportFrom('br1@example.com', offenderUserId);
    await reportFrom('br2@example.com', offenderUserId);
    const third = await reportFrom('br3@example.com', offenderUserId);

    expect(third.restricted).toBe(true);
    expect(REPORT_RESTRICTION_THRESHOLD).toBe(3);

    const profile = await getProfileByUserId(offenderUserId);
    expect(profile?.restrictedAt).not.toBeNull();

    const audit = await db.query.auditEvents.findFirst({
      where: eq(auditEvents.action, 'user_auto_restricted'),
    });
    expect(audit?.entityId).toBe(offenderUserId);
    expect(audit?.entityType).toBe('profile');
    expect(audit?.actorUserId).toBeNull();
  });

  it('does not re-restrict or re-log on a fourth report', async () => {
    for (const email of ['cr1@example.com', 'cr2@example.com', 'cr3@example.com']) {
      await reportFrom(email, offenderUserId);
    }
    const firstTimestamp = (await getProfileByUserId(offenderUserId))?.restrictedAt;

    const fourth = await reportFrom('cr4@example.com', offenderUserId);
    expect(fourth.restricted).toBe(false);

    expect((await getProfileByUserId(offenderUserId))?.restrictedAt).toEqual(firstTimestamp);

    const events = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.action, 'user_auto_restricted'));
    expect(events).toHaveLength(1);
  });

  it('does not count dismissed reports towards the threshold', async () => {
    await reportFrom('dr1@example.com', offenderUserId);
    const second = await reportFrom('dr2@example.com', offenderUserId);

    const { userId: adminId } = await createTestUser({ email: 'admin@university.example' });
    await createTestProfile({ userId: adminId, role: 'admin' });
    mockAuth.mockResolvedValue({ user: { id: adminId } });
    await reviewReport({ reportId: second.reportId!, status: 'dismissed' });

    await reportFrom('dr3@example.com', offenderUserId);

    // Two outstanding, not three, so no restriction.
    expect((await getProfileByUserId(offenderUserId))?.restrictedAt).toBeNull();
  });
});

describe('what a restriction actually prevents', () => {
  let restrictedUserId: string;
  let mentorUserId: string;

  beforeEach(async () => {
    const restricted = await createTestUser({ email: 'restricted@example.com' });
    restrictedUserId = restricted.userId;
    await createTestProfile({ userId: restrictedUserId, role: 'mentee' });
    await db
      .update(profiles)
      .set({ restrictedAt: new Date() })
      .where(eq(profiles.userId, restrictedUserId));

    const mentor = await createTestUser({ email: 'target-mentor@example.com' });
    mentorUserId = mentor.userId;
    await createTestProfile({ userId: mentorUserId, role: 'mentor', verified: true, visibleOnMap: true });
  });

  it('blocks a restricted user from sending a contact request', async () => {
    mockAuth.mockResolvedValue({ user: { id: restrictedUserId } });

    const result = await sendChatRequest({ mentorUserId });

    expect(result.error).toBe(RESTRICTED_SENDER_ERROR);
    expect(await db.select().from(chatRequests)).toHaveLength(0);
  });

  it('blocks a restricted user from sending a message in an existing thread', async () => {
    const request = await createTestChatRequest({
      requesterUserId: restrictedUserId,
      recipientUserId: mentorUserId,
      status: 'accepted',
    });
    mockAuth.mockResolvedValue({ user: { id: restrictedUserId } });

    const result = await sendMessage({ chatRequestId: request.id, body: 'Hello again' });

    expect(result.error).toBe(RESTRICTED_SENDER_ERROR);
  });

  it('still lets the other party message a restricted user', async () => {
    const request = await createTestChatRequest({
      requesterUserId: restrictedUserId,
      recipientUserId: mentorUserId,
      status: 'accepted',
    });
    mockAuth.mockResolvedValue({ user: { id: mentorUserId } });

    const result = await sendMessage({ chatRequestId: request.id, body: 'Are you ok?' });

    expect(result.success).toBe(true);
  });

  it('lets an unrestricted user through unchanged', async () => {
    const { userId } = await createTestUser({ email: 'fine@example.com' });
    await createTestProfile({ userId, role: 'mentee' });
    mockAuth.mockResolvedValue({ user: { id: userId } });

    expect((await sendChatRequest({ mentorUserId })).success).toBe(true);
  });
});

describe('admin control over restrictions', () => {
  let adminUserId: string;
  let targetUserId: string;

  beforeEach(async () => {
    const admin = await createTestUser({ email: 'admin2@university.example' });
    adminUserId = admin.userId;
    await createTestProfile({ userId: adminUserId, role: 'admin' });
    mockAuth.mockResolvedValue({ user: { id: adminUserId } });

    const target = await createTestUser({ email: 'target@example.com' });
    targetUserId = target.userId;
    await createTestProfile({ userId: targetUserId, role: 'mentee' });
  });

  it('rejects a non-admin', async () => {
    const { userId } = await createTestUser({ email: 'nobody@example.com' });
    await createTestProfile({ userId, role: 'mentee' });
    mockAuth.mockResolvedValue({ user: { id: userId } });

    const result = await setUserRestricted(targetUserId, true, 'because');
    expect(result.error).toContain('Only administrators');
  });

  it('requires a reason', async () => {
    const result = await setUserRestricted(targetUserId, true, '');
    expect(result.error).toBeDefined();
    expect((await getProfileByUserId(targetUserId))?.restrictedAt).toBeNull();
  });

  it('restricts and then lifts, auditing both', async () => {
    expect((await setUserRestricted(targetUserId, true, 'Spamming mentors')).success).toBe(true);
    expect((await getProfileByUserId(targetUserId))?.restrictedAt).not.toBeNull();

    expect((await setUserRestricted(targetUserId, false, 'Appeal upheld')).success).toBe(true);
    expect((await getProfileByUserId(targetUserId))?.restrictedAt).toBeNull();

    const actions = (
      await db.select().from(auditEvents).where(eq(auditEvents.entityId, targetUserId))
    ).map((event) => event.action);
    expect(actions).toContain('user_restricted');
    expect(actions).toContain('user_unrestricted');
  });

  it('lifts a restriction the threshold applied automatically', async () => {
    const offender = await createTestUser({ email: 'auto2@example.com' });
    await createTestProfile({ userId: offender.userId, role: 'mentee' });
    for (const email of ['er1@example.com', 'er2@example.com', 'er3@example.com']) {
      await reportFrom(email, offender.userId);
    }
    expect((await getProfileByUserId(offender.userId))?.restrictedAt).not.toBeNull();

    mockAuth.mockResolvedValue({ user: { id: adminUserId } });
    expect((await setUserRestricted(offender.userId, false, 'Reviewed, reports unfounded')).success).toBe(true);
    expect((await getProfileByUserId(offender.userId))?.restrictedAt).toBeNull();

    // Reports are still on file; lifting does not delete the evidence.
    expect(await db.select().from(reports).where(eq(reports.reportedUserId, offender.userId))).toHaveLength(3);
  });

  it('refuses to let an admin restrict themselves', async () => {
    const result = await setUserRestricted(adminUserId, true, 'testing');
    expect(result.error).toContain('your own admin account');
  });
});
