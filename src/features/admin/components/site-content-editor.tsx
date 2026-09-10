"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updateSiteContent } from "@/features/admin/actions/admin-actions";
import type { SiteContent } from "@/features/site-content/lib/site-content";

export function SiteContentEditor({ initialContent }: { initialContent: SiteContent }) {
	const [content, setContent] = useState(initialContent);
	const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
	const [isPending, startTransition] = useTransition();

	const updateField = (field: keyof SiteContent, value: string) => {
		setContent((current) => ({ ...current, [field]: value }));
		setFeedback(null);
	};

	const save = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		startTransition(async () => {
			const result = await updateSiteContent(content);
			setFeedback(result.error ? { type: "error", text: result.error } : { type: "success", text: "Site content saved." });
		});
	};

	return (
		<form onSubmit={save} className="space-y-5 rounded-xl border border-border bg-card p-5">
			<div className="grid gap-4 md:grid-cols-2">
				<label className="space-y-1.5 text-sm">
					<span className="font-medium">Homepage headline</span>
					<input value={content.homepageTitle} onChange={(event) => updateField("homepageTitle", event.target.value)} maxLength={160} className="h-9 w-full rounded-lg border border-input bg-background px-3" />
				</label>
				<label className="space-y-1.5 text-sm">
					<span className="font-medium">Homepage description</span>
					<input value={content.homepageDescription} onChange={(event) => updateField("homepageDescription", event.target.value)} maxLength={500} className="h-9 w-full rounded-lg border border-input bg-background px-3" />
				</label>
			</div>
			<label className="block space-y-1.5 text-sm">
				<span className="font-medium">Contact-request guidance</span>
				<textarea value={content.contactRequestGuidance} onChange={(event) => updateField("contactRequestGuidance", event.target.value)} maxLength={2000} rows={5} className="w-full rounded-lg border border-input bg-background px-3 py-2 leading-6" />
			</label>
			<label className="block space-y-1.5 text-sm">
				<span className="font-medium">Contact-request examples</span>
				<textarea value={content.contactRequestExamples} onChange={(event) => updateField("contactRequestExamples", event.target.value)} maxLength={4000} rows={8} className="w-full rounded-lg border border-input bg-background px-3 py-2 leading-6" />
			</label>
			<div className="flex items-center justify-between gap-3">
				{feedback ? <p className={`text-sm ${feedback.type === "error" ? "text-destructive" : "text-emerald-700"}`}>{feedback.text}</p> : <span />}
				<button type="submit" disabled={isPending} className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">{isPending ? "Saving..." : "Save content"}</button>
			</div>
		</form>
	);
}