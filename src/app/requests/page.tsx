import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { profiles } from "@/db/schema/profiles";
import { mentorReferrals } from "@/db/schema/referrals";
import { MentorReferralApprovals } from "@/features/auth/components/mentor-referral-approvals";
import { isAlwaysVerified, isMentorCapable } from "@/features/auth/lib/roles";

export default async function RequestsPage() {
	const session = await auth();
	if (!session?.user?.id) redirect("/login");

	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, session.user.id),
	});
	const isVerified = isAlwaysVerified(profile?.role) || Boolean(profile?.verified);
	if (!isMentorCapable(profile?.role) || !isVerified) redirect("/profile");

	const pendingReferrals = await db
		.select({
			id: mentorReferrals.id,
			mentorName: users.name,
			mentorEmail: users.email,
			createdAt: mentorReferrals.createdAt,
		})
		.from(mentorReferrals)
		.innerJoin(users, eq(users.id, mentorReferrals.mentorUserId))
		.where(
			and(
				eq(mentorReferrals.refereeUserId, session.user.id),
				eq(mentorReferrals.status, "pending"),
			),
		);

	const archivedReferrals = await db
		.select({
			id: mentorReferrals.id,
			mentorName: users.name,
			mentorEmail: users.email,
			createdAt: mentorReferrals.createdAt,
			status: mentorReferrals.status,
			reviewedAt: mentorReferrals.reviewedAt,
		})
		.from(mentorReferrals)
		.innerJoin(users, eq(users.id, mentorReferrals.mentorUserId))
		.where(
			and(
				eq(mentorReferrals.refereeUserId, session.user.id),
				inArray(mentorReferrals.status, ["confirmed", "rejected"]),
			),
		);

	return (
		<main className="mx-auto w-full max-w-2xl px-4 py-10">
			<div className="mb-8 space-y-2">
				<h1 className="text-2xl font-semibold">Verification requests</h1>
				<p className="text-sm text-muted-foreground">
					Review mentor nominations assigned to you as their referee.
				</p>
			</div>
			<MentorReferralApprovals
				referrals={pendingReferrals}
				archivedReferrals={archivedReferrals}
				showEmptyState
			/>
		</main>
	);
}
