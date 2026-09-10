"use client";

import { useState, useTransition } from "react";
import { setMenteeMessageRateLimit } from "@/features/admin/actions/admin-actions";

export function MenteeMessageRateLimitToggle({ enabled }: { enabled: boolean }) {
	const [isEnabled, setIsEnabled] = useState(enabled);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const handleChange = (nextEnabled: boolean) => {
		setError(null);
		setIsEnabled(nextEnabled);
		startTransition(async () => {
			const result = await setMenteeMessageRateLimit(nextEnabled);
			if (result.error) {
				setIsEnabled(!nextEnabled);
				setError(result.error);
			}
		});
	};

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h3 className="font-medium">Mentee message rate limit</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						Limit mentees to two unanswered messages per conversation.
					</p>
				</div>
				<label className="flex shrink-0 items-center gap-2 text-sm">
					<span>{isEnabled ? "On" : "Off"}</span>
					<input
						type="checkbox"
						checked={isEnabled}
						disabled={isPending}
						onChange={(event) => handleChange(event.target.checked)}
						className="size-4 accent-primary"
					/>
				</label>
			</div>
			{error && <p className="mt-2 text-sm text-destructive">{error}</p>}
		</div>
	);
}
