import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles } from "@/db/schema/profiles";
import { auditEvents } from "@/db/schema/audit";
import { reports } from "@/db/schema/moderation";
import { ACTIONABLE_REPORT_STATUSES } from "@/features/admin/queries/get-reports";

/**
 * Outstanding reports at which an account is automatically restricted.
 * reportUser allows one active report per reporter per target, so reaching
 * three means three different people, not one person filing repeatedly.
 */
export const REPORT_RESTRICTION_THRESHOLD = 3;

export const RESTRICTED_SENDER_ERROR =
  "Your account is restricted while reported activity is reviewed, so you cannot start new conversations or send messages.";

type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

export async function isRestricted(userId: string, executor: Executor = db) {
  const [profile] = await executor
    .select({ restrictedAt: profiles.restrictedAt })
    .from(profiles)
    .where(eq(profiles.userId, userId));

  return Boolean(profile?.restrictedAt);
}

/**
 * Restricts an account once it reaches the threshold. Called after a report
 * is filed.
 *
 * Only ever applies a restriction, never lifts one. Lifting is an admin
 * decision, so dismissing reports below the threshold does not silently
 * release someone who is still under review.
 */
export async function applyReportRestriction(reportedUserId: string, executor: Executor = db) {
  const rows = await executor
    .select({ status: reports.status })
    .from(reports)
    .where(eq(reports.reportedUserId, reportedUserId));

  const outstanding = rows.filter((row) =>
    (ACTIONABLE_REPORT_STATUSES as readonly string[]).includes(row.status),
  ).length;

  if (outstanding < REPORT_RESTRICTION_THRESHOLD) return { restricted: false, outstanding };

  // isNull keeps this idempotent: a fourth report against an already
  // restricted account must not refresh the timestamp or log again.
  const [updated] = await executor
    .update(profiles)
    .set({ restrictedAt: new Date() })
    .where(and(eq(profiles.userId, reportedUserId), isNull(profiles.restrictedAt)))
    .returning({ userId: profiles.userId });

  if (!updated) return { restricted: false, outstanding };

  await executor.insert(auditEvents).values({
    actorUserId: null,
    action: "user_auto_restricted",
    entityType: "profile",
    entityId: reportedUserId,
    metadata: {
      reason: `Automatically restricted after ${outstanding} outstanding reports.`,
      outstandingReports: outstanding,
      threshold: REPORT_RESTRICTION_THRESHOLD,
    },
  });

  return { restricted: true, outstanding };
}
