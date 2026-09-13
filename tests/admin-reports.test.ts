import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { auditEvents, reports } from '@/db/schema';
import { reviewReport } from '@/features/admin/actions/admin-actions';
import {
  countActionableReports,
  getReportedUsers,
} from '@/features/admin/queries/get-reports';
import { createTestProfile, createTestUser } from './fixtures';

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mockAuth }));

async function createReport(options: {
  reporterUserId: string;
  reportedUserId: string;
  reason?: 'harassment' | 'spam' | 'other';
  status?: 'open' | 'reviewed' | 'resolved' | 'dismissed';
  details?: string | null;
}) {
  const {
    reporterUserId,
    reportedUserId,
    reason = 'harassment',
    status = 'open',
    details = null,
  } = options;
  const [row] = await db
    .insert(reports)
    .values({ reporterUserId, reportedUserId, reason, status, details })
    .returning();
  return row;
}

describe('admin report queue', () => {
  let adminUserId: string;
  let offenderUserId: string;

  beforeEach(async () => {
    const admin = await createTestUser({ email: 'admin@university.example' });
    adminUserId = admin.userId;
    await createTestProfile({ userId: adminUserId, role: 'admin' });
    mockAuth.mockResolvedValue({ user: { id: adminUserId } });

    const offender = await createTestUser({ email: 'offender@example.com', name: 'Olly Offender' });
    offenderUserId = offender.userId;
    await createTestProfile({ userId: offenderUserId, role: 'mentor', verified: true });
  });

  it('returns nothing when no reports exist', async () => {
    expect(await getReportedUsers()).toHaveLength(0);
  });

  it('groups every report against one person into a single entry', async () => {
    for (const email of ['r1@example.com', 'r2@example.com', 'r3@example.com']) {
      const { userId } = await createTestUser({ email });
      await createReport({ reporterUserId: userId, reportedUserId: offenderUserId });
    }

    const queue = await getReportedUsers();
    expect(queue).toHaveLength(1);
    expect(queue[0].userId).toBe(offenderUserId);
    expect(queue[0].name).toBe('Olly Offender');
    expect(queue[0].actionableCount).toBe(3);
    expect(queue[0].totalCount).toBe(3);
    expect(queue[0].reports).toHaveLength(3);
    expect(queue[0].role).toBe('mentor');
    expect(queue[0].verified).toBe(true);
  });

  it('does not count dismissed or resolved reports as outstanding', async () => {
    const { userId: a } = await createTestUser({ email: 'a@example.com' });
    const { userId: b } = await createTestUser({ email: 'b@example.com' });
    const { userId: c } = await createTestUser({ email: 'c@example.com' });
    await createReport({ reporterUserId: a, reportedUserId: offenderUserId, status: 'open' });
    await createReport({ reporterUserId: b, reportedUserId: offenderUserId, status: 'dismissed' });
    await createReport({ reporterUserId: c, reportedUserId: offenderUserId, status: 'resolved' });

    const queue = await getReportedUsers();
    expect(queue[0].actionableCount).toBe(1);
    expect(queue[0].totalCount).toBe(3);

    const counts = await countActionableReports([offenderUserId]);
    expect(counts.get(offenderUserId)).toBe(1);
  });

  it('counts a reviewed report as still outstanding', async () => {
    const { userId } = await createTestUser({ email: 'reviewer-target@example.com' });
    await createReport({ reporterUserId: userId, reportedUserId: offenderUserId, status: 'reviewed' });

    const counts = await countActionableReports([offenderUserId]);
    expect(counts.get(offenderUserId)).toBe(1);
  });

  it('sorts the worst offenders first', async () => {
    const { userId: quiet } = await createTestUser({ email: 'quiet@example.com' });
    await createTestProfile({ userId: quiet, role: 'mentee' });
    const { userId: r1 } = await createTestUser({ email: 'rr1@example.com' });
    const { userId: r2 } = await createTestUser({ email: 'rr2@example.com' });

    await createReport({ reporterUserId: r1, reportedUserId: quiet });
    await createReport({ reporterUserId: r1, reportedUserId: offenderUserId });
    await createReport({ reporterUserId: r2, reportedUserId: offenderUserId });

    const queue = await getReportedUsers();
    expect(queue.map((entry) => entry.userId)).toEqual([offenderUserId, quiet]);
  });

  describe('reviewReport', () => {
    it('rejects a non-admin', async () => {
      const { userId } = await createTestUser({ email: 'member@example.com' });
      await createTestProfile({ userId, role: 'mentee' });
      mockAuth.mockResolvedValue({ user: { id: userId } });
      const { userId: reporterId } = await createTestUser({ email: 'rep@example.com' });
      const report = await createReport({ reporterUserId: reporterId, reportedUserId: offenderUserId });

      const result = await reviewReport({ reportId: report.id, status: 'dismissed' });
      expect(result.error).toContain('Only administrators');

      const [unchanged] = await db.select().from(reports).where(eq(reports.id, report.id));
      expect(unchanged.status).toBe('open');
    });

    it('records the decision, the reviewer and an audit event', async () => {
      const { userId: reporterId } = await createTestUser({ email: 'rep2@example.com' });
      const report = await createReport({ reporterUserId: reporterId, reportedUserId: offenderUserId });

      const result = await reviewReport({
        reportId: report.id,
        status: 'dismissed',
        resolution: 'Reporter was mistaken',
      });
      expect(result.success).toBe(true);

      const [updated] = await db.select().from(reports).where(eq(reports.id, report.id));
      expect(updated.status).toBe('dismissed');
      expect(updated.resolution).toBe('Reporter was mistaken');
      expect(updated.reviewedByUserId).toBe(adminUserId);
      expect(updated.reviewedAt).not.toBeNull();

      const audit = await db.query.auditEvents.findFirst({
        where: eq(auditEvents.entityId, report.id),
      });
      expect(audit?.action).toBe('report_dismissed');
      expect(audit?.entityType).toBe('report');
      expect(audit?.actorUserId).toBe(adminUserId);
    });

    it('dismissing a report drops it out of the outstanding count', async () => {
      const { userId: r1 } = await createTestUser({ email: 'd1@example.com' });
      const { userId: r2 } = await createTestUser({ email: 'd2@example.com' });
      const first = await createReport({ reporterUserId: r1, reportedUserId: offenderUserId });
      await createReport({ reporterUserId: r2, reportedUserId: offenderUserId });

      expect((await countActionableReports([offenderUserId])).get(offenderUserId)).toBe(2);

      await reviewReport({ reportId: first.id, status: 'dismissed' });

      expect((await countActionableReports([offenderUserId])).get(offenderUserId)).toBe(1);
    });

    it('returns an error for a report that does not exist', async () => {
      const result = await reviewReport({
        reportId: '00000000-0000-0000-0000-000000000000',
        status: 'resolved',
      });
      expect(result.error).toContain('not found');
    });
  });
});
