import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, MessageCircle, Settings } from "lucide-react";
import { auth } from "@/auth";
import { getPublicProfile } from "@/features/profile/queries/get-public-profile";
import { ModerationActions } from "@/features/moderation/components/moderation-actions";

function initials(name: string | null) {
	if (!name) return "?";
	const parts = name.trim().split(/\s+/);
	return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default async function PublicProfilePage({
	params,
}: {
	params: Promise<{ userId: string }>;
}) {
	const session = await auth();
	if (!session?.user?.id) redirect("/login");

	const { userId } = await params;
	const profile = await getPublicProfile(userId, session.user.id);
	if (!profile) notFound();

	return (
		<main className="mx-auto w-full max-w-2xl px-4 py-10">
			<div className="rounded-xl border border-border/80 bg-card px-6 py-8">
				<div className="flex items-start justify-between gap-4">
					<div className="flex items-center gap-4">
						<span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
							{initials(profile.name)}
						</span>
						<div>
							<div className="flex items-center gap-1.5">
								<h1 className="text-xl font-semibold">{profile.name ?? "Unnamed user"}</h1>
								{profile.role === "mentor" && profile.verified && (
									<BadgeCheck className="size-4 shrink-0 text-emerald-600" aria-label="Verified mentor" />
								)}
							</div>
							<p className="text-sm capitalize text-muted-foreground">{profile.role}</p>
						</div>
					</div>
					{profile.isSelf ? (
						<Link
							href="/profile"
							className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
						>
							<Settings className="size-3.5" />
							Edit
						</Link>
					) : (
						profile.chatRequestId && (
							<Link
								href={`/connections/${profile.chatRequestId}`}
								className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
							>
								<MessageCircle className="size-3.5" />
								Message
							</Link>
						)
					)}
				</div>

				{profile.isSelf && (
					<p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
						This is how your profile looks to others. Manage what&apos;s visible from Profile settings.
					</p>
				)}

				<dl className="mt-6 space-y-4 text-sm">
					{profile.role === "mentor" && (
						<>
							{profile.subject && (
								<div>
									<dt className="font-medium text-foreground">Field of study</dt>
									<dd className="mt-0.5 text-muted-foreground">
										{profile.subject}
										{profile.degreeLevel ? ` (${profile.degreeLevel})` : ""}
									</dd>
								</div>
							)}
							{profile.university ? (
								<div>
									<dt className="font-medium text-foreground">University</dt>
									<dd className="mt-0.5 text-muted-foreground">{profile.university}</dd>
								</div>
							) : (
								profile.isSelf &&
								!profile.privacy.showUniversity && (
									<p className="text-xs italic text-muted-foreground">University is hidden from your public profile.</p>
								)
							)}
							{profile.city ? (
								<div>
									<dt className="font-medium text-foreground">City</dt>
									<dd className="mt-0.5 text-muted-foreground">{profile.city}</dd>
								</div>
							) : (
								profile.isSelf &&
								!profile.privacy.showCity && (
									<p className="text-xs italic text-muted-foreground">City is hidden from your public profile.</p>
								)
							)}
							{profile.bio ? (
								<div>
									<dt className="font-medium text-foreground">Bio</dt>
									<dd className="mt-0.5 whitespace-pre-wrap leading-6 text-muted-foreground">{profile.bio}</dd>
								</div>
							) : (
								profile.isSelf &&
								!profile.privacy.showBio && (
									<p className="text-xs italic text-muted-foreground">Bio is hidden from your public profile.</p>
								)
							)}
						</>
					)}

					{profile.role === "mentee" && (
						<>
							{profile.targetPrograms && (
								<div>
									<dt className="font-medium text-foreground">Aiming for</dt>
									<dd className="mt-0.5 whitespace-pre-wrap leading-6 text-muted-foreground">
										{profile.targetPrograms}
									</dd>
								</div>
							)}
							{profile.background && (
								<div>
									<dt className="font-medium text-foreground">Background</dt>
									<dd className="mt-0.5 whitespace-pre-wrap leading-6 text-muted-foreground">
										{profile.background}
									</dd>
								</div>
							)}
							{profile.helpNeeded && (
								<div>
									<dt className="font-medium text-foreground">Looking for help with</dt>
									<dd className="mt-0.5 whitespace-pre-wrap leading-6 text-muted-foreground">
										{profile.helpNeeded}
									</dd>
								</div>
							)}
						</>
					)}
				</dl>
				{!profile.isSelf && <ModerationActions targetUserId={profile.userId} targetUserName={profile.name ?? "this user"} />}
			</div>
		</main>
	);
}
