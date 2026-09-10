import Link from "next/link";

type Connection = {
	requestId: string;
	otherUserId: string;
	otherName: string | null;
	otherRole: string;
	connectedAt: string | null;
	lastMessage: { body: string; isMine: boolean; createdAt: string } | null;
	unreadCount: number;
	isNewConnection: boolean;
};

function formatActivityTime(iso: string) {
	const date = new Date(iso);
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();
	if (isToday) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

	const isThisYear = date.getFullYear() === now.getFullYear();
	return date.toLocaleDateString([], { month: "short", day: "numeric", year: isThisYear ? undefined : "numeric" });
}

function initials(name: string | null) {
	if (!name) return "?";
	const parts = name.trim().split(/\s+/);
	return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function ConnectionsList({ connections }: { connections: Connection[] }) {
	return (
		<div className="space-y-1.5">
			{connections.map((c) => {
				const isUnread = c.unreadCount > 0 || c.isNewConnection;
				const activityAt = c.lastMessage?.createdAt ?? c.connectedAt;

				return (
					<div
						key={c.requestId}
						className="flex items-center gap-3 rounded-lg border border-border/80 bg-card px-3 py-3 transition-colors hover:bg-muted/50"
					>
						<Link href={`/people/${c.otherUserId}`} className="shrink-0">
							<span
								aria-hidden
								className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground transition-opacity hover:opacity-80"
							>
								{initials(c.otherName)}
							</span>
						</Link>

						<Link href={`/connections/${c.requestId}`} className="min-w-0 flex-1">
							<div className="flex items-center justify-between gap-2">
								<p className={`truncate ${isUnread ? "font-semibold" : "font-medium"}`}>
									{c.otherName ?? "Unnamed user"}
								</p>
								{activityAt && (
									<span
										className={`shrink-0 text-xs ${isUnread ? "font-medium text-primary" : "text-muted-foreground"}`}
									>
										{formatActivityTime(activityAt)}
									</span>
								)}
							</div>
							<p
								className={`truncate text-sm ${
									isUnread ? "font-medium text-foreground" : "text-muted-foreground"
								}`}
							>
								{c.lastMessage
									? `${c.lastMessage.isMine ? "You: " : ""}${c.lastMessage.body}`
									: c.isNewConnection
										? "You're connected - say hello!"
										: "No messages yet"}
							</p>
						</Link>

						{isUnread && (
							<span
								aria-label="Unread"
								className="size-2.5 shrink-0 rounded-full bg-primary"
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}
