import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { profiles } from "@/db/schema/profiles";
import {
	getConnectionsReceived,
	getConnectionsSent,
} from "@/features/chat-requests/queries/get-my-connections";
import {
	getArchivedChatRequestsSent,
	getPendingChatRequestsSent,
} from "@/features/chat-requests/queries/get-chat-requests-sent";
import {
	getArchivedChatRequestsReceived,
	getPendingChatRequestsReceived,
} from "@/features/chat-requests/queries/get-chat-requests-received";
import { getConnectionActivity } from "@/features/chat-requests/queries/get-connection-activity";
import { SentChatRequests } from "@/features/chat-requests/components/sent-chat-requests";
import { ReceivedChatRequests } from "@/features/chat-requests/components/received-chat-requests";
import { ConnectionsList } from "@/features/chat-requests/components/connections-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

export default async function ConnectionsPage() {
	const session = await auth();
	if (!session?.user?.id) redirect("/login");

	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, session.user.id),
	});
	if (!profile) redirect("/");

	// Snapshot the previous visit before we overwrite it below - it's what
	// tells a connection with no new message apart, "new" from "old".
	const previouslyViewedAt = profile.connectionsViewedAt ?? new Date(0);

	// Visiting this page clears the Connections unread badge.
	await db.update(profiles).set({ connectionsViewedAt: new Date() }).where(eq(profiles.userId, session.user.id));

	// Only mentors are ever a request's target (they're the only role listed
	// on the map), so only mentors can receive requests. Everyone - mentee,
	// mentor, or admin - can send one.
	const canReceive = profile.role === "mentor";

	const [pendingReceived, archivedReceived, pendingSent, archivedSent, connectedReceived, connectedSent] =
		await Promise.all([
			canReceive ? getPendingChatRequestsReceived(session.user.id) : Promise.resolve([]),
			canReceive ? getArchivedChatRequestsReceived(session.user.id) : Promise.resolve([]),
			getPendingChatRequestsSent(session.user.id),
			getArchivedChatRequestsSent(session.user.id),
			canReceive ? getConnectionsReceived(session.user.id) : Promise.resolve([]),
			getConnectionsSent(session.user.id),
		]);

	const rawConnections = [...connectedReceived, ...connectedSent];
	const activity = await getConnectionActivity(
		rawConnections.map((c) => c.requestId),
		session.user.id,
	);

	const connections = rawConnections
		.map((c) => {
			const { lastMessage, unreadCount } = activity.get(c.requestId) ?? {
				lastMessage: null,
				unreadCount: 0,
			};
			const isNewConnection = !lastMessage && Boolean(c.connectedAt) && c.connectedAt! > previouslyViewedAt;
			return {
				...c,
				connectedAt: c.connectedAt?.toISOString() ?? null,
				lastMessage: lastMessage
					? { ...lastMessage, createdAt: lastMessage.createdAt.toISOString(), isMine: lastMessage.senderId === session.user.id }
					: null,
				unreadCount,
				isNewConnection,
				sortKey: (lastMessage?.createdAt ?? c.connectedAt ?? new Date(0)).getTime(),
			};
		})
		.sort((a, b) => b.sortKey - a.sortKey);
	const totalPending = pendingReceived.length + pendingSent.length;
	const unreadConnectionsCount = connections.filter((c) => c.unreadCount > 0 || c.isNewConnection).length;

	return (
		<main className="mx-auto w-full max-w-2xl px-4 py-10">
			<div className="mb-8 space-y-2">
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-semibold">Your connections</h1>
					{connections.length > 0 && (
						<span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
							{connections.length}
						</span>
					)}
				</div>
				<p className="text-sm text-muted-foreground">
					{canReceive
						? "Review requests, track ones you've sent, and message people you're connected with."
						: "Track chat requests you've sent and message mentors who've accepted."}
				</p>
			</div>
			<Tabs defaultValue={canReceive && pendingReceived.length > 0 ? "received" : "pending"} className="w-full">
				<TabsList className="w-full">
					{canReceive && (
						<TabsTrigger value="received" className="flex-1">
							Received
							{pendingReceived.length > 0 && (
								<span className="ml-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
									{pendingReceived.length}
								</span>
							)}
						</TabsTrigger>
					)}
					<TabsTrigger value="pending" className="flex-1">
						Sent
						{pendingSent.length > 0 && (
							<span className="ml-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
								{pendingSent.length}
							</span>
						)}
					</TabsTrigger>
					<TabsTrigger value="connected" className="flex-1">
						Connected
						{unreadConnectionsCount > 0 && (
							<span className="ml-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
								{unreadConnectionsCount}
							</span>
						)}
					</TabsTrigger>
				</TabsList>
				{canReceive && (
					<TabsContent value="received" className="pt-4">
						<ReceivedChatRequests requests={pendingReceived} archivedRequests={archivedReceived} />
					</TabsContent>
				)}
				<TabsContent value="pending" className="pt-4">
					<SentChatRequests requests={pendingSent} archivedRequests={archivedSent} />
				</TabsContent>
				<TabsContent value="connected" className="pt-4">
					{connections.length === 0 ? (
						<section className="rounded-xl border border-border/80 bg-card px-4 py-6 text-center">
							<h2 className="font-semibold">No connections yet</h2>
							<p className="mt-1 text-sm leading-6 text-muted-foreground">
								{totalPending > 0
									? "Once a pending request is accepted, it'll show up here."
									: "Browse the map and request contact with a verified mentor to get started."}
							</p>
						</section>
					) : (
						<ConnectionsList connections={connections} />
					)}
				</TabsContent>
			</Tabs>
		</main>
	);
}
