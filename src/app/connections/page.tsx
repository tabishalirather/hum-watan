import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Mail } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { profiles } from "@/db/schema/profiles";
import { isMentorCapable } from "@/features/auth/lib/roles";
import {
	getConnectionsForMentee,
	getConnectionsForMentor,
} from "@/features/chat-requests/queries/get-my-connections";

export default async function ConnectionsPage() {
	const session = await auth();
	if (!session?.user?.id) redirect("/login");

	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, session.user.id),
	});
	if (!profile) redirect("/");

	const isMentee = profile.role === "mentee";
	const connections = isMentee
		? await getConnectionsForMentee(session.user.id)
		: isMentorCapable(profile.role)
			? await getConnectionsForMentor(session.user.id)
			: [];

	return (
		<main className="mx-auto w-full max-w-2xl px-4 py-10">
			<div className="mb-8 space-y-2">
				<h1 className="text-2xl font-semibold">Your connections</h1>
				<p className="text-sm text-muted-foreground">
					{isMentee
						? "Mentors who've accepted your chat request. Reach out directly to keep the conversation going."
						: "Mentees you've accepted. Reach out directly to keep the conversation going."}
				</p>
			</div>

			{connections.length === 0 ? (
				<section className="rounded-xl border border-border/80 bg-card px-4 py-6 text-center">
					<h2 className="font-semibold">No connections yet</h2>
					<p className="mt-1 text-sm leading-6 text-muted-foreground">
						{isMentee
							? "Browse the map and request contact with a verified mentor to get started."
							: "Accepted chat requests will appear here."}
					</p>
				</section>
			) : (
				<div className="space-y-3">
					{isMentee
						? (connections as Awaited<ReturnType<typeof getConnectionsForMentee>>).map((c) => (
							<div key={c.requestId} className="rounded-lg border border-border/80 bg-card px-4 py-4">
								<p className="font-medium">{c.mentorName ?? "Unnamed mentor"}</p>
								<p className="mt-1 text-sm text-muted-foreground">
									{c.subject}
									{c.degreeLevel ? ` (${c.degreeLevel})` : ""}
								</p>
								{c.universityName && (
									<p className="text-sm text-muted-foreground">
										{c.universityName}, {c.cityName}, {c.countryName}
									</p>
								)}
								<a
									href={`mailto:${c.mentorEmail}`}
									className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
								>
									<Mail className="size-3.5" />
									{c.mentorEmail}
								</a>
								{c.connectedAt && (
									<p className="mt-2 text-xs text-muted-foreground">
										Connected {c.connectedAt.toLocaleDateString()}
									</p>
								)}
							</div>
						))
						: (connections as Awaited<ReturnType<typeof getConnectionsForMentor>>).map((c) => (
							<div key={c.requestId} className="rounded-lg border border-border/80 bg-card px-4 py-4">
								<p className="font-medium">{c.menteeName ?? "Unnamed mentee"}</p>
								{c.targetPrograms && (
									<p className="mt-1 text-sm text-muted-foreground">Aiming for: {c.targetPrograms}</p>
								)}
								{c.helpNeeded && (
									<p className="text-sm text-muted-foreground">Looking for help with: {c.helpNeeded}</p>
								)}
								<a
									href={`mailto:${c.menteeEmail}`}
									className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
								>
									<Mail className="size-3.5" />
									{c.menteeEmail}
								</a>
								{c.connectedAt && (
									<p className="mt-2 text-xs text-muted-foreground">
										Connected {c.connectedAt.toLocaleDateString()}
									</p>
								)}
							</div>
						))}
				</div>
			)}
		</main>
	);
}
