"use server";

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { auditEvents } from "@/db/schema/audit";
import { reports } from "@/db/schema/moderation";
import { users } from "@/db/schema/auth";

const reportSchema = z.object({
	reportedUserId: z.string().uuid(),
	reason: z.enum(["harassment", "spam", "inappropriate_content", "scam_or_fraud", "privacy_concern", "other"]),
	details: z.string().trim().max(2000, "Keep report details under 2000 characters.").optional(),
});

export type ReportUserInput = z.infer<typeof reportSchema>;

export async function reportUser(input: ReportUserInput) {
	const session = await auth();
	if (!session?.user?.id) return { error: "You must be signed in to report a user." };

	const parsed = reportSchema.safeParse(input);
	if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid report." };
	const { reportedUserId, reason, details } = parsed.data;
	if (reportedUserId === session.user.id) return { error: "You cannot report yourself." };

	const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, reportedUserId));
	if (!target) return { error: "This user is no longer available." };

	const existing = await db
		.select({ id: reports.id })
		.from(reports)
		.where(
			and(
				eq(reports.reporterUserId, session.user.id),
				eq(reports.reportedUserId, reportedUserId),
				inArray(reports.status, ["open", "reviewed"]),
			),
		)
		.limit(1);
	if (existing.length > 0) return { error: "You already have an active report for this user." };

	const result = await db.transaction(async (tx) => {
		const [report] = await tx
			.insert(reports)
			.values({ reporterUserId: session.user.id, reportedUserId, reason, details: details || null })
			.returning({ id: reports.id });
		await tx.insert(auditEvents).values({
			actorUserId: session.user.id,
			action: "user_report_created",
			entityType: "report",
			entityId: report.id,
			metadata: { reportedUserId, reason },
		});
		return report;
	});

	return { success: true, reportId: result.id };
}