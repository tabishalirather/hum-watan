import { alias } from "drizzle-orm/pg-core";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { profiles } from "@/db/schema/profiles";
import { reports } from "@/db/schema/moderation";

// A report only becomes actionable in the context of everything else filed
// against the same person, so the queue is grouped by the reported user
// rather than listed flat. ACTIONABLE_STATUSES is what counts towards that
// grouping: dismissing a malicious report should stop it weighing against
// the person it targeted.
export const ACTIONABLE_REPORT_STATUSES = ["open", "reviewed"] as const;

const reporterUser = alias(users, "report_reporter");
const reportedUser = alias(users, "report_reported");

export type ReportedUser = Awaited<ReturnType<typeof getReportedUsers>>[number];

export async function getReportedUsers() {
  const rows = await db
    .select({
      reportId: reports.id,
      reason: reports.reason,
      details: reports.details,
      status: reports.status,
      createdAt: reports.createdAt,
      reviewedAt: reports.reviewedAt,
      resolution: reports.resolution,
      reporterUserId: reports.reporterUserId,
      reporterName: reporterUser.name,
      reporterEmail: reporterUser.email,
      reportedUserId: reports.reportedUserId,
      reportedName: reportedUser.name,
      reportedEmail: reportedUser.email,
      reportedIsActive: reportedUser.isActive,
      reportedRole: profiles.role,
      reportedVerified: profiles.verified,
      reportedVisibleOnMap: profiles.visibleOnMap,
    })
    .from(reports)
    .innerJoin(reporterUser, eq(reporterUser.id, reports.reporterUserId))
    .innerJoin(reportedUser, eq(reportedUser.id, reports.reportedUserId))
    .leftJoin(profiles, eq(profiles.userId, reports.reportedUserId))
    .orderBy(desc(reports.createdAt))
    .limit(500);

  const grouped = new Map<
    string,
    {
      userId: string;
      name: string | null;
      email: string;
      role: string | null;
      isActive: boolean;
      verified: boolean | null;
      visibleOnMap: boolean | null;
      actionableCount: number;
      totalCount: number;
      latestReportAt: Date;
      reports: {
        id: string;
        reason: string;
        details: string | null;
        status: string;
        createdAt: Date;
        reviewedAt: Date | null;
        resolution: string | null;
        reporterName: string | null;
        reporterEmail: string;
      }[];
    }
  >();

  for (const row of rows) {
    const existing = grouped.get(row.reportedUserId);
    const entry =
      existing ??
      {
        userId: row.reportedUserId,
        name: row.reportedName,
        email: row.reportedEmail,
        role: row.reportedRole,
        isActive: row.reportedIsActive,
        verified: row.reportedVerified,
        visibleOnMap: row.reportedVisibleOnMap,
        actionableCount: 0,
        totalCount: 0,
        latestReportAt: row.createdAt,
        reports: [],
      };

    entry.totalCount += 1;
    if ((ACTIONABLE_REPORT_STATUSES as readonly string[]).includes(row.status)) {
      entry.actionableCount += 1;
    }
    if (row.createdAt > entry.latestReportAt) entry.latestReportAt = row.createdAt;
    entry.reports.push({
      id: row.reportId,
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.createdAt,
      reviewedAt: row.reviewedAt,
      resolution: row.resolution,
      reporterName: row.reporterName,
      reporterEmail: row.reporterEmail,
    });

    if (!existing) grouped.set(row.reportedUserId, entry);
  }

  // Worst first: most outstanding reports, then most recent.
  return Array.from(grouped.values()).sort(
    (a, b) =>
      b.actionableCount - a.actionableCount ||
      b.latestReportAt.getTime() - a.latestReportAt.getTime(),
  );
}

/** Outstanding report count per user, used wherever a threshold is applied. */
export async function countActionableReports(reportedUserIds: string[]) {
  const counts = new Map<string, number>();
  if (reportedUserIds.length === 0) return counts;

  const rows = await db
    .select({ reportedUserId: reports.reportedUserId, status: reports.status })
    .from(reports)
    .where(inArray(reports.reportedUserId, reportedUserIds));

  for (const row of rows) {
    if (!(ACTIONABLE_REPORT_STATUSES as readonly string[]).includes(row.status)) continue;
    counts.set(row.reportedUserId, (counts.get(row.reportedUserId) ?? 0) + 1);
  }

  return counts;
}
