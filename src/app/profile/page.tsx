import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { profiles } from "@/db/schema/profiles";
import { eq } from "drizzle-orm";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { getProfileOptions } from "@/features/profile/queries/get-profile-options";

export default async function ProfilePage() {
	const session = await auth();
	if (!session?.user?.id) redirect("/login");

	const [profile, universities] = await Promise.all([
		db.query.profiles.findFirst({ where: eq(profiles.userId, session.user.id) }),
		getProfileOptions(),
	]);

	if (!profile) redirect("/");

	return (
		<div className="mx-auto w-full max-w-2xl px-4 py-10">
			<div className="mb-8 space-y-2">
				<h1 className="text-2xl font-semibold">Your profile</h1>
				<p className="text-sm text-muted-foreground">
					Complete your academic details so the right people can find you on the map.
				</p>
			</div>
			<ProfileForm
				initialValues={{
					subject: profile.subject ?? "",
					degreeLevel: profile.degreeLevel ?? "other",
					universityId: profile.universityId ?? "",
					bio: profile.bio ?? "",
				}}
				universities={universities}
			/>
		</div>
	);
}
