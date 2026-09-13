"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
	reviewReport,
	revokeMentorVerification,
	setMentorMapVisibility,
	setUserActive,
	setUserRestricted,
} from "@/features/admin/actions/admin-actions";

type Report = {
	id: string;
	reason: string;
	details: string | null;
	status: string;
	createdAt: string;
	reporterName: string | null;
	reporterEmail: string;
	resolution: string | null;
};

type ReportedUser = {
	userId: string;
	name: string | null;
	email: string;
	role: string | null;
	isActive: boolean;
	verified: boolean | null;
	visibleOnMap: boolean | null;
	restrictedAt: string | null;
	actionableCount: number;
	totalCount: number;
	latestReportAt: string;
	reports: Report[];
};

const STATUS_STYLES: Record<string, string> = {
	open: "bg-amber-100 text-amber-900",
	reviewed: "bg-sky-100 text-sky-900",
	resolved: "bg-emerald-100 text-emerald-900",
	dismissed: "bg-muted text-muted-foreground",
};

function askReason(action: string) {
	const reason = window.prompt(`Reason for ${action}:`);
	return reason?.trim() || null;
}

function ReportedUserRow({ user }: { user: ReportedUser }) {
	const router = useRouter();
	const [isExpanded, setIsExpanded] = useState(user.actionableCount >= 3);
	const [message, setMessage] = useState<string | null>(null);
	const [isBusy, setIsBusy] = useState(false);

	const run = async (action: () => Promise<{ success?: boolean; error?: string }>) => {
		setMessage(null);
		setIsBusy(true);
		const result = await action();
		setIsBusy(false);
		if (result.error) setMessage(result.error);
		else router.refresh();
	};

	return (
		<div className="overflow-hidden rounded-xl border border-border bg-card">
			<div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
				<button
					type="button"
					className="flex min-w-0 flex-1 items-center gap-3 text-left"
					aria-expanded={isExpanded}
					onClick={() => setIsExpanded((expanded) => !expanded)}
				>
					<ChevronDown className={`size-4 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
					<span className="min-w-0">
						<span className="flex items-center gap-2">
							<span className="truncate font-medium">{user.name ?? "Unnamed user"}</span>
							<span
								className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
									user.actionableCount >= 3 ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
								}`}
							>
								{user.actionableCount} open
							</span>
							{user.totalCount !== user.actionableCount && (
								<span className="text-[10px] text-muted-foreground">{user.totalCount} total</span>
							)}
							{user.restrictedAt && (
								<span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
									Restricted
								</span>
							)}
						</span>
						<span className="block truncate text-xs text-muted-foreground">
							{user.email} · {user.role ?? "no profile"} · {user.isActive ? "Active" : "Inactive"}
							{user.role === "mentor" ? ` · ${user.verified ? "Verified" : "Unverified"}` : ""}
							{user.role === "mentor" ? ` · ${user.visibleOnMap ? "On map" : "Hidden"}` : ""}
						</span>
					</span>
				</button>

				<div className="flex flex-wrap items-center gap-2">
					<Button size="xs" variant="outline" render={<Link href={`/people/${user.userId}`} />} nativeButton={false}>
						View profile
					</Button>
					<Button
						size="xs"
						variant="outline"
						disabled={isBusy}
						onClick={() => {
							const restricting = !user.restrictedAt;
							const reason = askReason(restricting ? "restricting this account" : "lifting this restriction");
							if (reason) void run(() => setUserRestricted(user.userId, restricting, reason));
						}}
					>
						{user.restrictedAt ? "Lift restriction" : "Restrict"}
					</Button>
					<Button
						size="xs"
						variant="outline"
						disabled={isBusy}
						onClick={() => {
							const reason = askReason(user.isActive ? "deactivating this account" : "reactivating this account");
							if (reason) void run(() => setUserActive(user.userId, !user.isActive, reason));
						}}
					>
						{user.isActive ? "Deactivate" : "Reactivate"}
					</Button>
					{user.role === "mentor" && user.verified && (
						<Button
							size="xs"
							variant="outline"
							disabled={isBusy}
							onClick={() => {
								const reason = askReason("revoking mentor verification");
								if (reason && window.confirm("Revoke this mentor's verification?")) {
									void run(() => revokeMentorVerification(user.userId, reason));
								}
							}}
						>
							Unverify
						</Button>
					)}
					{user.role === "mentor" && user.visibleOnMap && (
						<Button
							size="xs"
							variant="outline"
							disabled={isBusy}
							onClick={() => {
								const reason = askReason("hiding this mentor from the map");
								if (reason) void run(() => setMentorMapVisibility(user.userId, false, reason));
							}}
						>
							Hide from map
						</Button>
					)}
				</div>
			</div>

			{message && <p className="px-4 pb-2 text-xs text-destructive">{message}</p>}

			{isExpanded && (
				<div className="space-y-2 border-t border-border bg-muted/30 p-3">
					{user.reports.map((report) => (
						<div key={report.id} className="rounded-lg border border-border/80 bg-card px-3 py-2.5">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<span className="flex items-center gap-2 text-sm">
									<span className="font-medium capitalize">{report.reason.replaceAll("_", " ")}</span>
									<span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize ${STATUS_STYLES[report.status] ?? "bg-muted"}`}>
										{report.status}
									</span>
								</span>
								<span className="text-[10px] text-muted-foreground">
									{new Date(report.createdAt).toLocaleString()}
								</span>
							</div>
							<p className="mt-1 text-xs text-muted-foreground">
								Reported by {report.reporterName ?? "Unnamed"} ({report.reporterEmail})
							</p>
							{report.details && (
								<p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-foreground/90">{report.details}</p>
							)}
							{report.resolution && (
								<p className="mt-1.5 text-xs italic text-muted-foreground">Resolution: {report.resolution}</p>
							)}
							<div className="mt-2 flex flex-wrap gap-1.5">
								{(["reviewed", "resolved", "dismissed"] as const)
									.filter((next) => next !== report.status)
									.map((next) => (
										<Button
											key={next}
											size="xs"
											variant="outline"
											disabled={isBusy}
											onClick={() => {
												const resolution = window.prompt(`Note for marking this report ${next} (optional):`) ?? undefined;
												void run(() => reviewReport({ reportId: report.id, status: next, resolution }));
											}}
										>
											Mark {next}
										</Button>
									))}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export function ReportQueue({ reportedUsers }: { reportedUsers: ReportedUser[] }) {
	if (reportedUsers.length === 0) {
		return (
			<div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
				No user reports yet.
			</div>
		);
	}

	const atThreshold = reportedUsers.filter((user) => user.actionableCount >= 3).length;

	return (
		<div className="space-y-2">
			{atThreshold > 0 && (
				<div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
					<TriangleAlert className="size-4 shrink-0" />
					{atThreshold} {atThreshold === 1 ? "account has" : "accounts have"} three or more outstanding reports.
				</div>
			)}
			{reportedUsers.map((user) => (
				<ReportedUserRow key={user.userId} user={user} />
			))}
		</div>
	);
}
