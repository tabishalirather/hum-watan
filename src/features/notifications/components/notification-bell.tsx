"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Bell, MessageCircle, UserPlus, Users } from "lucide-react";
import type {
	NotificationCategory,
	NotificationsPayload,
} from "@/features/notifications/queries/get-notifications";

// Serialised over the wire, so createdAt arrives as an ISO string.
type Notification = Omit<NotificationsPayload["items"][number], "createdAt"> & {
	createdAt: string;
};

type NotificationsResponse = Omit<NotificationsPayload, "items"> & { items: Notification[] };

const POLL_INTERVAL_MS = 30_000;

const EMPTY: NotificationsResponse = {
	total: 0,
	counts: { messages: 0, requests: 0, connections: 0, verifications: 0 },
	items: [],
};

const CATEGORY_META: Record<
	NotificationCategory,
	{ label: string; icon: typeof Bell; emptyMessage: string }
> = {
	messages: { label: "Messages", icon: MessageCircle, emptyMessage: "No unread messages." },
	requests: { label: "Requests", icon: UserPlus, emptyMessage: "No pending contact requests." },
	connections: { label: "Connections", icon: Users, emptyMessage: "No new connections." },
	verifications: {
		label: "Verifications",
		icon: BadgeCheck,
		emptyMessage: "No mentor nominations waiting on you.",
	},
};

const TAB_ORDER: NotificationCategory[] = ["messages", "requests", "connections", "verifications"];

async function fetchNotifications(): Promise<NotificationsResponse> {
	const res = await fetch("/api/notifications");
	if (!res.ok) throw new Error("Failed to load notifications");
	return res.json();
}

function formatRelativeTime(iso: string) {
	const then = new Date(iso).getTime();
	const minutes = Math.round((Date.now() - then) / 60_000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.round(hours / 24);
	if (days < 7) return `${days}d ago`;
	return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function NotificationBell() {
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<NotificationCategory | "all">("all");
	const containerRef = useRef<HTMLDivElement>(null);

	const notificationsQuery = useQuery({
		queryKey: ["notifications"],
		queryFn: fetchNotifications,
		refetchInterval: POLL_INTERVAL_MS,
	});

	// Keep the last good payload on screen while a poll is failing, so a
	// dropped connection empties nothing.
	const data = notificationsQuery.data ?? EMPTY;
	const isFirstLoad = notificationsQuery.isPending && !notificationsQuery.data;

	useEffect(() => {
		if (!isOpen) return;

		const onPointerDown = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsOpen(false);
		};

		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [isOpen]);

	const visibleItems =
		activeTab === "all" ? data.items : data.items.filter((item) => item.category === activeTab);
	const badgeLabel = data.total > 99 ? "99+" : String(data.total);

	const handleNavigate = (href: string) => {
		setIsOpen(false);
		// The source rows are what mark an item read (opening a thread, reviewing
		// a request), so refetch once the destination has had a chance to do it.
		router.push(href);
		setTimeout(() => void notificationsQuery.refetch(), 600);
	};

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				onClick={() => setIsOpen((open) => !open)}
				aria-haspopup="dialog"
				aria-expanded={isOpen}
				aria-label={
					data.total > 0 ? `Notifications, ${data.total} new` : "Notifications, none new"
				}
				className="relative inline-flex size-8 items-center justify-center rounded-lg text-foreground/70 transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted aria-expanded:text-foreground"
			>
				<Bell className="size-4" />
				{data.total > 0 && (
					<span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
						{badgeLabel}
					</span>
				)}
			</button>

			{isOpen && (
				<div
					role="dialog"
					aria-label="Notifications"
					className="absolute right-0 z-50 mt-2 flex max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"
				>
					<div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
						<h2 className="text-sm font-semibold">Notifications</h2>
						{data.total > 0 && (
							<span className="text-xs text-muted-foreground">{data.total} new</span>
						)}
					</div>

					<div className="flex flex-wrap gap-1 border-b border-border px-2 py-2">
						<button
							type="button"
							onClick={() => setActiveTab("all")}
							aria-pressed={activeTab === "all"}
							className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
								activeTab === "all"
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-muted hover:text-foreground"
							}`}
						>
							All
							{data.total > 0 && <span className="ml-1 opacity-80">{data.total}</span>}
						</button>
						{TAB_ORDER.map((category) => {
							const meta = CATEGORY_META[category];
							const count = data.counts[category];
							return (
								<button
									key={category}
									type="button"
									onClick={() => setActiveTab(category)}
									aria-pressed={activeTab === category}
									className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
										activeTab === category
											? "bg-primary text-primary-foreground"
											: "text-muted-foreground hover:bg-muted hover:text-foreground"
									}`}
								>
									{meta.label}
									{count > 0 && <span className="ml-1 opacity-80">{count}</span>}
								</button>
							);
						})}
					</div>

					<div className="flex-1 overflow-y-auto">
						{isFirstLoad ? (
							<div className="space-y-2 p-3" aria-label="Loading notifications">
								<div className="h-12 animate-pulse rounded-lg bg-muted" />
								<div className="h-12 animate-pulse rounded-lg bg-muted" />
								<div className="h-12 animate-pulse rounded-lg bg-muted" />
							</div>
						) : visibleItems.length === 0 ? (
							<p className="px-4 py-8 text-center text-sm text-muted-foreground">
								{activeTab === "all" ? "You are all caught up." : CATEGORY_META[activeTab].emptyMessage}
							</p>
						) : (
							<ul className="divide-y divide-border">
								{visibleItems.map((item) => {
									const Icon = CATEGORY_META[item.category].icon;
									return (
										<li key={item.id}>
											<Link
												href={item.href}
												onClick={(event) => {
													event.preventDefault();
													handleNavigate(item.href);
												}}
												className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
											>
												<span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
													<Icon className="size-3.5" />
												</span>
												<span className="min-w-0 flex-1">
													<span className="flex items-baseline justify-between gap-2">
														<span className="truncate text-sm font-medium">{item.title}</span>
														<span className="shrink-0 text-[10px] text-muted-foreground">
															{formatRelativeTime(item.createdAt)}
														</span>
													</span>
													<span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">
														{item.body}
													</span>
													{item.count && item.count > 1 && (
														<span className="mt-1 inline-block rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
															{item.count} unread
														</span>
													)}
												</span>
											</Link>
										</li>
									);
								})}
							</ul>
						)}

						{notificationsQuery.isError && (
							<p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
								Couldn&apos;t refresh, retrying...
							</p>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
