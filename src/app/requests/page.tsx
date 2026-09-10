import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { profiles } from "@/db/schema/profiles";
import { mentorReferrals } from "@/db/schema/referrals";
import { MentorReferralApprovals } from "@/features/auth/components/mentor-referral-approvals";
import { isAlwaysVerified, isMentorCapable } from "@/features/auth/lib/roles";
import { ChatRequestApprovals } from "@/features/chat-requests/components/chat-request-approvals";
import {
	getArchivedChatRequestsForMentor,
	getPendingChatRequestsForMentor,
} from "@/features/chat-requests/queries/get-chat-requests-for-mentor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

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

	const pendingChatRequests = await getPendingChatRequestsForMentor(session.user.id);
	const archivedChatRequests = await getArchivedChatRequestsForMentor(session.user.id);

	return (
		<main className="mx-auto w-full max-w-2xl px-4 py-10">
			<div className="mb-8 space-y-2">
				<h1 className="text-2xl font-semibold">Mentor requests</h1>
				<p className="text-sm text-muted-foreground">
					Review mentor nominations assigned to you as their referee.
				</p>
			</div>
			<Tabs defaultValue="verification" className="w-full">
				<TabsList className="w-full">
					<TabsTrigger value="verification" className="flex-1">
						Verification requests
						{pendingReferrals.length > 0 && (
							<span className="ml-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
								{pendingReferrals.length}
							</span>
						)}
					</TabsTrigger>
					<TabsTrigger value="chat" className="flex-1">
						Chat requests
						{pendingChatRequests.length > 0 && (
							<span className="ml-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
								{pendingChatRequests.length}
							</span>
						)}
					</TabsTrigger>
				</TabsList>
				<TabsContent value="verification" className="pt-4">
					<MentorReferralApprovals
						referrals={pendingReferrals}
						archivedReferrals={archivedReferrals}
						showEmptyState
					/>
				</TabsContent>
				<TabsContent value="chat" className="pt-4">
					<ChatRequestApprovals requests={pendingChatRequests} archivedRequests={archivedChatRequests} />
				</TabsContent>
			</Tabs>
		</main>
	);
}
