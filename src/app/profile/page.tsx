import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { profiles } from "@/db/schema/profiles";
import { eq } from "drizzle-orm";
import { MentorProfileForm } from "@/features/profile/components/mentor-profile-form";
import { MenteeProfileForm } from "@/features/profile/components/mentee-profile-form";
import { getProfileOptions } from "@/features/profile/queries/get-profile-options";

export default async function ProfilePage() {
	const session = await auth();
	if (!session?.user?.id) redirect("/login");

	const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, session.user.id) });
	if (!profile) redirect("/");

	if (profile.role === "mentor") {
		const universities = await getProfileOptions();
		return (
			<div className="mx-auto w-full max-w-2xl px-4 py-10">
				<div className="mb-8 space-y-2">
					<h1 className="text-2xl font-semibold">Your profile</h1>
					<p className="text-sm text-muted-foreground">
						Complete your academic details so the right people can find you on the map.
					</p>
				</div>
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
