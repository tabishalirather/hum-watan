import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
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
import { SentChatRequests } from "@/features/chat-requests/components/sent-chat-requests";
import { ReceivedChatRequests } from "@/features/chat-requests/components/received-chat-requests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

export default async function ConnectionsPage() {
	const session = await auth();
	if (!session?.user?.id) redirect("/login");

	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, session.user.id),
	});
	if (!profile) redirect("/");

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

	const connections = [...connectedReceived, ...connectedSent].sort((a, b) => {
		const aTime = a.connectedAt ? new Date(a.connectedAt).getTime() : 0;
		const bTime = b.connectedAt ? new Date(b.connectedAt).getTime() : 0;
		return bTime - aTime;
	});
	const totalPending = pendingReceived.length + pendingSent.length;

	return (
		<main className="mx-auto w-full max-w-2xl px-4 py-10">
			<div className="mb-8 space-y-2">
				<h1 className="text-2xl font-semibold">Your connections</h1>
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
						{connections.length > 0 && (
							<span className="ml-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
								{connections.length}
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
						<div className="space-y-3">
							{connections.map((c) => (
								<Link
									key={c.requestId}
									href={`/connections/${c.requestId}`}
									className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-card px-4 py-4 transition-colors hover:bg-muted/50"
								>
									<div>
										<p className="font-medium">{c.otherName ?? "Unnamed user"}</p>
										<p className="text-sm capitalize text-muted-foreground">{c.otherRole}</p>
										{c.connectedAt && (
											<p className="mt-1 text-xs text-muted-foreground">
												Connected {new Date(c.connectedAt).toLocaleDateString()}
											</p>
										)}
									</div>
									<MessageCircle className="size-4 shrink-0 text-primary" />
								</Link>
							))}
						</div>
					)}
				</TabsContent>
			</Tabs>
		</main>
	);
}
