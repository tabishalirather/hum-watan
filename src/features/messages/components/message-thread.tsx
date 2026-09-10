"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { sendMessage } from "@/features/messages/actions/send-message";
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
	otherPartyName,
	initialMessages,
}: {
	chatRequestId: string;
	currentUserId: string;
	otherPartyName: string;
	initialMessages: Message[];
}) {
	const queryClient = useQueryClient();
	const [draft, setDraft] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const bottomRef = useRef<HTMLDivElement>(null);

	const messagesQuery = useQuery({
		queryKey: ["messages", chatRequestId],
		queryFn: () => fetchMessages(chatRequestId),
		initialData: initialMessages,
		refetchInterval: POLL_INTERVAL_MS,
	});

	const messages = messagesQuery.data ?? [];

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	const handleSend = async () => {
		const body = draft.trim();
		if (!body || isSending) return;

		setIsSending(true);
		setError(null);
		const result = await sendMessage({ chatRequestId, body });
		setIsSending(false);

		if (result.error) {
			setError(result.error);
			return;
		}
		setDraft("");
		queryClient.invalidateQueries({ queryKey: ["messages", chatRequestId] });
	};

	return (
		<div className="flex h-[70vh] flex-col rounded-xl border border-border/80 bg-card">
			<div className="border-b border-border/80 px-4 py-3">
				<p className="font-semibold">{otherPartyName}</p>
			</div>
			<div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
				{messages.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No messages yet. Say hello to {otherPartyName}.
					</p>
				) : (
					messages.map((message) => {
						const isMine = message.senderId === currentUserId;
						return (
							<div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
								<div
									className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-6 ${
										isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
									}`}
								>
									<p className="whitespace-pre-wrap break-words">{message.body}</p>
									<p
										className={`mt-1 text-[10px] ${
											isMine ? "text-primary-foreground/70" : "text-muted-foreground"
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
				<div ref={bottomRef} />
			</div>
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
				<Button type="submit" size="sm" disabled={isSending || !draft.trim()}>
					<Send />
					Send
				</Button>
			</form>
		</div>
	);
}
