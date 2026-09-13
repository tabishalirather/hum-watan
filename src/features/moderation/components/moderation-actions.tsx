"use client";

import { useState, useTransition } from "react";
import { blockUser, unblockUser } from "@/features/moderation/actions/block-user";
import { reportUser, type ReportUserInput } from "@/features/moderation/actions/report-user";

const reasons: { value: ReportUserInput["reason"]; label: string }[] = [
	{ value: "harassment", label: "Harassment" },
	{ value: "spam", label: "Spam" },
	{ value: "inappropriate_content", label: "Inappropriate content" },
	{ value: "scam_or_fraud", label: "Scam or fraud" },
	{ value: "privacy_concern", label: "Privacy concern" },
	{ value: "other", label: "Other" },
];

export function ModerationActions({
	targetUserId,
	targetUserName,
	initialBlocked = false,
}: {
	targetUserId: string;
	targetUserName: string;
	initialBlocked?: boolean;
}) {
	const [blocked, setBlocked] = useState(initialBlocked);
	const [showReport, setShowReport] = useState(false);
	const [showBlock, setShowBlock] = useState(false);
	const [reason, setReason] = useState<ReportUserInput["reason"]>("other");
	const [details, setDetails] = useState("");
	const [blockDetails, setBlockDetails] = useState("");
	const [feedback, setFeedback] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const runBlock = () => {
		setFeedback(null);
		startTransition(async () => {
			const result = blocked
				? await unblockUser(targetUserId)
				: await blockUser({ blockedUserId: targetUserId, details: blockDetails });
			if (result.error) {
				setFeedback(result.error);
				return;
			}
			setBlocked(!blocked);
			setShowBlock(false);
			setBlockDetails("");
			setFeedback(blocked ? "User unblocked." : "User blocked.");
		});
	};

	const submitReport = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setFeedback(null);
		startTransition(async () => {
			const result = await reportUser({ reportedUserId: targetUserId, reason, details });
			if (result.error) {
				setFeedback(result.error);
				return;
			}
			setShowReport(false);
			setDetails("");
			setFeedback("Report submitted. Thank you for helping keep the community safe.");
		});
	};

	return (
		<div className="mt-5 border-t border-border/80 pt-4">
			<div className="flex flex-wrap gap-2">
				<button type="button" onClick={() => (blocked ? runBlock() : setShowBlock((value) => !value))} disabled={isPending} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50">
					{blocked ? "Unblock user" : "Block user"}
				</button>
				{!blocked && <button type="button" onClick={() => setShowReport((value) => !value)} disabled={isPending} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50">{showReport ? "Cancel report" : "Report user"}</button>}
			</div>
			{showBlock && !blocked && (
				<div className="mt-4 space-y-3 rounded-lg bg-muted/50 p-4">
					<p className="text-xs leading-5 text-muted-foreground">Blocking {targetUserName} prevents new contact requests and messages. Existing conversation history remains available. Add an optional private note explaining why you are blocking this user.</p>
					<textarea value={blockDetails} onChange={(event) => setBlockDetails(event.target.value)} maxLength={2000} rows={3} placeholder="Why are you blocking this user? (optional)" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
					<div className="flex gap-2">
						<button type="button" onClick={runBlock} disabled={isPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">{isPending ? "Blocking..." : "Confirm block"}</button>
						<button type="button" onClick={() => setShowBlock(false)} disabled={isPending} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium">Cancel</button>
					</div>
				</div>
			)}
			{showReport && (
				<form onSubmit={submitReport} className="mt-4 space-y-3 rounded-lg bg-muted/50 p-4">
					<p className="text-xs leading-5 text-muted-foreground">Report this user if something feels unsafe, inappropriate, or against the community guidelines. Reports are reviewed by the Hum Watan team.</p>
					<select value={reason} onChange={(event) => setReason(event.target.value as ReportUserInput["reason"])} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
						{reasons.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
					</select>
					<textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={2000} rows={4} placeholder="Why are you reporting this user? Add any helpful context (optional)" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
					<button type="submit" disabled={isPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">{isPending ? "Submitting..." : "Submit report"}</button>
				</form>
			)}
			{feedback && <p className="mt-2 text-xs text-muted-foreground">{feedback}</p>}
		</div>
	);
}