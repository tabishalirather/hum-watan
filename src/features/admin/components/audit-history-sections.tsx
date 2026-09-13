"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type AuditEvent = {
	id: string;
	action: string;
	entityType: string;
	entityId: string | null;
	metadata: Record<string, unknown> | null;
	createdAt: Date;
	actorName: string | null;
	actorEmail: string | null;
};

// Known entity types get a readable heading. Anything new added later still
// renders, just under its raw name, so a future entity type never silently
// disappears from the audit view.
const ENTITY_LABELS: Record<string, string> = {
	user: "Users",
	profile: "Profiles",
	mentor_referral: "Mentor referrals",
	report: "Reports",
	site_settings: "Site settings",
};

function labelFor(entityType: string) {
	return ENTITY_LABELS[entityType] ?? entityType.replaceAll("_", " ");
}

function reasonOf(metadata: Record<string, unknown> | null) {
	if (metadata && typeof metadata === "object" && "reason" in metadata && metadata.reason) {
		return String(metadata.reason);
	}
	return "-";
}

function AuditSection({ entityType, events }: { entityType: string; events: AuditEvent[] }) {
	const [isExpanded, setIsExpanded] = useState(false);
	const latest = events[0];

	return (
		<div className="overflow-hidden rounded-xl border border-border bg-card">
			<button
				type="button"
				className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
				aria-expanded={isExpanded}
				onClick={() => setIsExpanded((expanded) => !expanded)}
			>
				<span className="flex items-center gap-2">
					<span className="font-medium capitalize">{labelFor(entityType)}</span>
					<span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
						{events.length}
					</span>
				</span>
				<span className="flex items-center gap-3">
					{latest && (
						<span className="hidden text-xs text-muted-foreground sm:block">
							latest {latest.createdAt.toLocaleString()}
						</span>
					)}
					<ChevronDown className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
				</span>
			</button>

			{isExpanded && (
				<div className="overflow-x-auto border-t border-border">
					<table className="w-full min-w-[760px] text-left text-sm">
						<thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
							<tr>
								<th className="px-4 py-2">Time</th>
								<th className="px-4 py-2">Action</th>
								<th className="px-4 py-2">Actor</th>
								<th className="px-4 py-2">Reason</th>
							</tr>
						</thead>
						<tbody>
							{events.map((event) => (
								<tr key={event.id} className="border-b border-border last:border-0">
									<td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">
										{event.createdAt.toLocaleString()}
									</td>
									<td className="px-4 py-2 capitalize">{event.action.replaceAll("_", " ")}</td>
									<td className="px-4 py-2 text-xs">{event.actorName ?? event.actorEmail ?? "System"}</td>
									<td className="max-w-xs truncate px-4 py-2 text-xs text-muted-foreground">
										{reasonOf(event.metadata)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

export function AuditHistorySections({ events }: { events: AuditEvent[] }) {
	if (events.length === 0) {
		return (
			<div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
				No audit events yet.
			</div>
		);
	}

	// Events arrive newest first, so each group preserves that order and the
	// groups themselves are ordered by how much is in them.
	const groups = new Map<string, AuditEvent[]>();
	for (const event of events) {
		const bucket = groups.get(event.entityType);
		if (bucket) bucket.push(event);
		else groups.set(event.entityType, [event]);
	}

	const ordered = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);

	return (
		<div className="space-y-2">
			{ordered.map(([entityType, groupEvents]) => (
				<AuditSection key={entityType} entityType={entityType} events={groupEvents} />
			))}
		</div>
	);
}
