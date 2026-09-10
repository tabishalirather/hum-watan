"use client";

import { useState, useTransition } from "react";
import { setContactRequestMessageEnabled } from "@/features/admin/actions/admin-actions";

export function ContactRequestMessageToggle({ enabled }: { enabled: boolean }) {
	const [isEnabled, setIsEnabled] = useState(enabled);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const handleChange = (nextEnabled: boolean) => {
		setError(null);
		setIsEnabled(nextEnabled);
		startTransition(async () => {
			const result = await setContactRequestMessageEnabled(nextEnabled);
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
					<h3 className="font-medium">First message with contact requests</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						Let requesters introduce themselves and explain what help they need.
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