"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import Link from "next/link";
import { sendMessage } from "@/features/messages/actions/send-message";
import { MENTEE_MESSAGE_RATE_LIMIT_ERROR } from "@/features/messages/lib/message-errors";
import { Button } from "@/shared/components/ui/button";

type Message = {
	id: string;
	senderId: string;
	body: string;
	createdAt: string;
};

const POLL_INTERVAL_MS = 4000;

async function fetchMessages(chatRequestId: string): Promise<Message[]> {
	const res = await fetch(`/api/connections/${chatRequestId}/messages`);
	if (!res.ok) throw new Error("Failed to load messages");
	return res.json();
}

export function MessageThread({
	chatRequestId,
	currentUserId,
	otherUserId,
	otherPartyName,
	initialMessages,
}: {
	chatRequestId: string;
	currentUserId: string;
	otherUserId: string;
	otherPartyName: string;
	initialMessages: Message[];
}) {
	const queryClient = useQueryClient();
	const [draft, setDraft] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [rateLimitReached, setRateLimitReached] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);

	const messagesQuery = useQuery({
		queryKey: ["messages", chatRequestId],
		queryFn: () => fetchMessages(chatRequestId),
		initialData: initialMessages,
		refetchInterval: POLL_INTERVAL_MS,
	});

	const messages = messagesQuery.data ?? [];
	const isInitialLoading = messagesQuery.isPending && !messagesQuery.data;

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	useEffect(() => {
		if (messages.some((message) => message.senderId === otherUserId)) {
			setRateLimitReached(false);
		}
	}, [messages, otherUserId]);

	const handleSend = async () => {
		const body = draft.trim();
		if (!body || isSending) return;

		setIsSending(true);
		setError(null);
		setRateLimitReached(false);
		const result = await sendMessage({ chatRequestId, body });
		setIsSending(false);

		if (result.error) {
			if (result.error === MENTEE_MESSAGE_RATE_LIMIT_ERROR) {
				setRateLimitReached(true);
			} else {
				setError(result.error);
			}
			return;
		}
		setDraft("");
		queryClient.invalidateQueries({ queryKey: ["messages", chatRequestId] });
	};

	return (
		<div className="flex h-[70vh] flex-col rounded-xl border border-border/80 bg-card">
			<div className="border-b border-border/80 px-4 py-3">
				<Link href={`/people/${otherUserId}`} className="font-semibold hover:underline">
					{otherPartyName}
				</Link>
			</div>
			<div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
				{isInitialLoading ? (
					<div className="space-y-3" aria-label="Loading messages">
						<div className="h-12 w-2/3 animate-pulse rounded-2xl bg-muted" />
						<div className="ml-auto h-12 w-1/2 animate-pulse rounded-2xl bg-muted" />
						<div className="h-12 w-3/5 animate-pulse rounded-2xl bg-muted" />
					</div>
				) : messages.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No messages yet. Say hello to {otherPartyName}.
					</p>
				) : (
					messages.map((message) => {
						const isMine = message.senderId === currentUserId;
						return (
							<div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
								<div
									className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-6 ${isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
										}`}
								>
									<p className="whitespace-pre-wrap break-words">{message.body}</p>
									<p
										className={`mt-1 text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"
											}`}
									>
										{new Date(message.createdAt).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</p>
								</div>
							</div>
						);
					})
				)}
				{messagesQuery.isError && messagesQuery.data && (
					<p className="text-xs text-muted-foreground">Couldn&apos;t refresh, retrying...</p>
				)}
				{messagesQuery.isError && !messagesQuery.data && (
					<p className="text-sm text-destructive">Couldn&apos;t load messages. Retrying...</p>
				)}
				<div ref={bottomRef} />
			</div>
			{rateLimitReached && <p className="px-4 pb-2 text-sm text-muted-foreground">Waiting for {otherPartyName} to reply before you send another message.</p>}
			{error && <p className="px-4 pb-2 text-sm text-destructive">{error}</p>}
			<form
				onSubmit={(e) => {
					e.preventDefault();
					handleSend();
				}}
				className="flex items-end gap-2 border-t border-border/80 px-3 py-3"
			>
				<textarea
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							handleSend();
						}
					}}
					placeholder="Write a message..."
					rows={1}
					maxLength={2000}
					className="min-h-9 flex-1 resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
				/>
				<Button type="submit" size="sm" disabled={isSending || !draft.trim() || rateLimitReached}>
					<Send />
					{isSending ? "Sending..." : !draft.trim() ? "Write a message" : rateLimitReached ? "Waiting" : "Send"}
				</Button>
			</form>
		</div>
	);
}
