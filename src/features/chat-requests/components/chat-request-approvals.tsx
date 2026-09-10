"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { reviewChatRequest } from "@/features/chat-requests/actions/review-chat-request";
import { Button } from "@/shared/components/ui/button";

type PendingChatRequest = {
	id: string;
	menteeName: string | null;
	menteeEmail: string;
	message: string | null;
	createdAt: Date;
};

type ArchivedChatRequest = PendingChatRequest & {
	status: "pending" | "accepted" | "rejected" | "cancelled";
	reviewedAt: Date | null;
};

export function ChatRequestApprovals({
	requests,
	archivedRequests = [],
}: {
	requests: PendingChatRequest[];
	archivedRequests?: ArchivedChatRequest[];
}) {
	const [pendingIds, setPendingIds] = useState<string[]>([]);
	const [message, setMessage] = useState<string | null>(null);
	const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);

	const review = async (requestId: string, decision: "accepted" | "rejected") => {
		const action = decision === "accepted" ? "accept" : "reject";
		if (!window.confirm(`Are you sure you want to ${action} this chat request?`)) return;

		setMessage(null);
		setPendingIds((current) => [...current, requestId]);
		const result = await reviewChatRequest(requestId, decision);
		setPendingIds((current) => current.filter((id) => id !== requestId));
		if (result.error) {
			setMessage(result.error);
			return;
		}
		window.location.reload();
	};

	if (requests.length === 0 && archivedRequests.length === 0) {
		return (
			<section className="rounded-xl border border-border/80 bg-card px-4 py-6 text-center">
				<h2 className="font-semibold">No chat requests yet</h2>
				<p className="mt-1 text-sm leading-6 text-muted-foreground">
					Chat requests from mentees will appear here.
				</p>
			</section>
		);
	}

	return (
		<section className="space-y-3">
			{requests.length === 0 ? (
				<p className="text-sm leading-6 text-muted-foreground">You have no pending chat requests.</p>
			) : (
				requests.map((request) => {
					const isPending = pendingIds.includes(request.id);
					return (
						<div key={request.id} className="rounded-lg border border-border/80 bg-card px-3 py-3">
							<p className="text-sm font-medium">{request.menteeName ?? "Unnamed mentee"}</p>
							<p className="text-xs text-muted-foreground">{request.menteeEmail}</p>
							{request.message && (
								<p className="mt-2 text-sm leading-6 text-foreground/90">&ldquo;{request.message}&rdquo;</p>
							)}
							<div className="mt-3 flex gap-2">
								<Button size="sm" disabled={isPending} onClick={() => review(request.id, "accepted")}>
									<Check />
									Accept
								</Button>
								<Button
									size="sm"
									variant="outline"
									disabled={isPending}
									onClick={() => review(request.id, "rejected")}
								>
									<X />
									Reject
								</Button>
							</div>
						</div>
					);
				})
			)}
			{message && <p className="text-sm text-destructive">{message}</p>}
			{archivedRequests.length > 0 && (
				<div className="border-t border-border/80 pt-3">
					<button
						type="button"
						className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold transition-colors hover:bg-muted/70"
						aria-expanded={isArchiveExpanded}
						onClick={() => setIsArchiveExpanded((expanded) => !expanded)}
					>
						<span className="flex items-center gap-2">
							Archived decisions
							<span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
								{archivedRequests.length}
							</span>
						</span>
						<ChevronDown className={`size-4 transition-transform ${isArchiveExpanded ? "rotate-180" : ""}`} />
					</button>
					{isArchiveExpanded && (
						<div className="mt-2 space-y-2">
							{archivedRequests.map((request) => (
								<div
									key={request.id}
									className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-card px-3 py-2"
								>
									<div>
										<p className="text-sm font-medium">{request.menteeName ?? "Unnamed mentee"}</p>
										<p className="text-xs text-muted-foreground">{request.menteeEmail}</p>
									</div>
									<div className="text-right text-xs">
										<p
											className={
												request.status === "accepted"
													? "font-semibold text-emerald-700"
													: "font-semibold text-rose-700"
											}
										>
											{request.status === "accepted"
												? "Accepted"
												: request.status === "rejected"
													? "Rejected"
													: "Cancelled"}
										</p>
										{request.reviewedAt && (
											<p className="text-muted-foreground">{request.reviewedAt.toLocaleDateString()}</p>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</section>
	);
}
