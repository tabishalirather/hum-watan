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
import {
	getArchivedChatRequestsForMentee,
	getPendingChatRequestsForMentee,
} from "@/features/chat-requests/queries/get-chat-requests-for-mentee";
import {
	getArchivedChatRequestsForMentor,
	getPendingChatRequestsForMentor,
} from "@/features/chat-requests/queries/get-chat-requests-for-mentor";
import { MenteeChatRequests } from "@/features/chat-requests/components/mentee-chat-requests";
import { ChatRequestApprovals } from "@/features/chat-requests/components/chat-request-approvals";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

export default async function ConnectionsPage() {
	const session = await auth();
	if (!session?.user?.id) redirect("/login");

	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, session.user.id),
	});
	if (!profile) redirect("/");

	const isMentee = profile.role === "mentee";
	const isMentor = isMentorCapable(profile.role);

	const [pending, archived, connections] = await Promise.all([
		isMentee
			? getPendingChatRequestsForMentee(session.user.id)
			: isMentor
				? getPendingChatRequestsForMentor(session.user.id)
				: Promise.resolve([]),
		isMentee
			? getArchivedChatRequestsForMentee(session.user.id)
			: isMentor
				? getArchivedChatRequestsForMentor(session.user.id)
				: Promise.resolve([]),
		isMentee
			? getConnectionsForMentee(session.user.id)
			: isMentor
				? getConnectionsForMentor(session.user.id)
				: Promise.resolve([]),
	]);

	return (
		<main className="mx-auto w-full max-w-2xl px-4 py-10">
			<div className="mb-8 space-y-2">
				<h1 className="text-2xl font-semibold">{isMentee ? "Your mentors" : "Your connections"}</h1>
				<p className="text-sm text-muted-foreground">
					{isMentee
						? "Track chat requests you've sent and the mentors who've accepted."
						: "Review incoming chat requests and see mentees you've connected with."}
				</p>
			</div>
			<Tabs defaultValue="pending" className="w-full">
				<TabsList className="w-full">
					<TabsTrigger value="pending" className="flex-1">
						Pending
						{pending.length > 0 && (
							<span className="ml-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
								{pending.length}
							</span>
						)}
					</TabsTrigger>
					<TabsTrigger value="connected" className="flex-1">
						Connected
						{connections.length > 0 && (
							<span className="ml-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
								{connections.length}
							</span>
						)}
					</TabsTrigger>
				</TabsList>
				<TabsContent value="pending" className="pt-4">
					{isMentee ? (
						<MenteeChatRequests
							requests={pending as Awaited<ReturnType<typeof getPendingChatRequestsForMentee>>}
							archivedRequests={archived as Awaited<ReturnType<typeof getArchivedChatRequestsForMentee>>}
						/>
					) : (
						<ChatRequestApprovals
							requests={pending as Awaited<ReturnType<typeof getPendingChatRequestsForMentor>>}
							archivedRequests={archived as Awaited<ReturnType<typeof getArchivedChatRequestsForMentor>>}
						/>
					)}
				</TabsContent>
				<TabsContent value="connected" className="pt-4">
					{connections.length === 0 ? (
						<section className="rounded-xl border border-border/80 bg-card px-4 py-6 text-center">
							<h2 className="font-semibold">No connections yet</h2>
							<p className="mt-1 text-sm leading-6 text-muted-foreground">
								{isMentee
									? "Once a mentor accepts your request, they'll show up here."
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
				</TabsContent>
			</Tabs>
		</main>
	);
}
