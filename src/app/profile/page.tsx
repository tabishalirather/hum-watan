import { redirect } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { profiles } from "@/db/schema/profiles";
import { eq } from "drizzle-orm";
import { MentorProfileForm } from "@/features/profile/components/mentor-profile-form";
import { MenteeProfileForm } from "@/features/profile/components/mentee-profile-form";
import { getProfileOptions } from "@/features/profile/queries/get-profile-options";
import { MentorReferralApprovals } from "@/features/auth/components/mentor-referral-approvals";
import { mentorReferrals } from "@/db/schema/referrals";
import { users } from "@/db/schema/auth";
import { and } from "drizzle-orm";

export default async function ProfilePage() {
	const session = await auth();
	if (!session?.user?.id) redirect("/login");

	const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, session.user.id) });
	if (!profile) redirect("/");

	if (profile.role === "mentor") {
		const [universities, pendingReferrals] = await Promise.all([
			getProfileOptions(),
			profile.verified
				? db
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
					)
				: Promise.resolve([]),
		]);
		return (
			<div className="mx-auto w-full max-w-2xl px-4 py-10">
				<div className="mb-8 space-y-2">
					<h1 className="text-2xl font-semibold">Your profile</h1>
					<p className="text-sm text-muted-foreground">
						Complete your academic details so the right people can find you on the map.
					</p>
				</div>
				<MentorReferralApprovals referrals={pendingReferrals} />
				{profile.verified ? (
					<div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-300/70 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
						<BadgeCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
						<div>
							<p className="font-semibold">Verified mentor</p>
							<p className="mt-1 leading-6">
								Your profile is verified and visible to the Hum Watan community on the map.
							</p>
						</div>
					</div>
				) : (
					<div className="mb-6 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-950">
						<p className="font-semibold">Your mentor account is awaiting verification.</p>
						<p className="mt-1 leading-6">
							You can update your profile now, but you will appear on the community map after your
							referee confirms your nomination through the emailed link.
						</p>
					</div>
				)}
				<MentorProfileForm
					initialValues={{
						subject: profile.subject ?? "",
						degreeLevel: profile.degreeLevel ?? "other",
						universityId: profile.universityId ?? "",
						bio: profile.bio ?? "",
						scholarshipStatus: profile.scholarshipStatus ?? "",
					}}
					universities={universities}
				/>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-2xl px-4 py-10">
			<div className="mb-8 space-y-2">
				<h1 className="text-2xl font-semibold">Your profile</h1>
				<p className="text-sm text-muted-foreground">
					You won&apos;t appear on the map — that&apos;s just for mentors to find. Tell us what
					you&apos;re working towards so mentors can see how to help, and use the map above to browse
					for one at the university, city, or scholarship you&apos;re targeting.
				</p>
			</div>
			<MenteeProfileForm
				initialValues={{
					targetPrograms: profile.targetPrograms ?? "",
					background: profile.background ?? "",
					helpNeeded: profile.helpNeeded ?? "",
				}}
			/>
		</div>
	);
}
