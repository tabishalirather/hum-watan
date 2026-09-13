import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { reports, userBlocks } from '@/db/schema';
import { blockUser, unblockUser } from '@/features/moderation/actions/block-user';
import { reportUser } from '@/features/moderation/actions/report-user';
import { createTestUser } from './fixtures';

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mockAuth }));

describe('user moderation details', () => {
  let reporterUserId: string;
  let targetUserId: string;

  beforeEach(async () => {
    const reporter = await createTestUser({ email: 'moderation-reporter@example.com' });
    reporterUserId = reporter.userId;
    const target = await createTestUser({ email: 'moderation-target@example.com' });
    targetUserId = target.userId;
    mockAuth.mockResolvedValue({ user: { id: reporterUserId } });
  });

  it('stores a custom explanation with a report', async () => {
    const result = await reportUser({
      reportedUserId: targetUserId,
      reason: 'harassment',
      details: 'They repeatedly sent messages after I asked them to stop.',
    });

    expect('success' in result && result.success).toBe(true);
    const [report] = await db.select().from(reports).where(eq(reports.reportedUserId, targetUserId));
    expect(report?.reason).toBe('harassment');
    expect(report?.details).toContain('asked them to stop');
  });

  it('stores a private custom explanation with a block and supports unblocking', async () => {
    const result = await blockUser({
      blockedUserId: targetUserId,
      details: 'I do not want further contact from this user.',
    });

    expect('success' in result && result.success).toBe(true);
    const [block] = await db.select().from(userBlocks).where(eq(userBlocks.blockedUserId, targetUserId));
    expect(block?.details).toContain('further contact');

    const unblockResult = await unblockUser(targetUserId);
    expect('success' in unblockResult && unblockResult.success).toBe(true);
    const remaining = await db.select().from(userBlocks).where(eq(userBlocks.blockedUserId, targetUserId));
    expect(remaining).toHaveLength(0);
  });
});
