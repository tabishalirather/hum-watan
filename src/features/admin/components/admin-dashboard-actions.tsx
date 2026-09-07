"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import {
	overrideMentorVerification,
	revokeMentorVerification,
	setMentorMapVisibility,
	setUserActive,
} from "@/features/admin/actions/admin-actions";

function askReason(action: string) {
	const reason = window.prompt(`Reason for ${action}:`);
	return reason?.trim() || null;
}

export function AdminDashboardActions({
	userId,
	isActive,
	verified,
	visibleOnMap,
}: {
	userId: string;
	isActive: boolean;
	verified: boolean;
	visibleOnMap: boolean;
}) {
	const router = useRouter();
	const [message, setMessage] = useState<string | null>(null);

	const run = async (action: () => Promise<{ success?: boolean; error?: string }>) => {
		setMessage(null);
		const result = await action();
		if (result.error) setMessage(result.error);
		else router.refresh();
	};

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Button size="xs" variant="outline" onClick={() => {
				const reason = askReason(isActive ? "deactivating this user" : "reactivating this user");
				if (reason) void run(() => setUserActive(userId, !isActive, reason));
			}}>
				{isActive ? "Deactivate" : "Reactivate"}
			</Button>
			{verified && (
				<Button size="xs" variant="outline" onClick={() => {
					const reason = askReason("revoking mentor verification");
					if (reason && window.confirm("Revoke this mentor's verification?")) void run(() => revokeMentorVerification(userId, reason));
				}}>
					Revoke verification
				</Button>
			)}
			{!verified && (
				<span className="text-xs text-muted-foreground">Not verified</span>
			)}
			{verified && (
				<Button size="xs" variant="outline" onClick={() => {
					const reason = askReason(visibleOnMap ? "hiding this mentor from the map" : "showing this mentor on the map");
					if (reason) void run(() => setMentorMapVisibility(userId, !visibleOnMap, reason));
				}}>
					{visibleOnMap ? "Hide from map" : "Show on map"}
				</Button>
			)}
			{message && <span className="text-xs text-destructive">{message}</span>}
		</div>
	);
}

export function AdminReferralActions({ referralId, status }: { referralId: string; status: "pending" | "confirmed" | "rejected" }) {
	const router = useRouter();
	const [message, setMessage] = useState<string | null>(null);
	const decision = status === "confirmed" ? "rejected" : "confirmed";
	const review = async () => {
		const reason = askReason(decision === "confirmed" ? "approving this referral" : "rejecting this referral");
		if (!reason || !window.confirm(`Apply admin decision: ${decision}?`)) return;
		const result = await overrideMentorVerification(referralId, decision, reason);
		if (result.error) setMessage(result.error);
		else router.refresh();
	};

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Button size="xs" variant={decision === "rejected" ? "outline" : "default"} onClick={() => void review()}>
				{decision === "rejected" ? "Reject" : "Approve"}
			</Button>
			{message && <span className="text-xs text-destructive">{message}</span>}
		</div>
	);
}
