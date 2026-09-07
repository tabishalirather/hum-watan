import { redirect } from "next/navigation";
import { AdminDashboardActions, AdminReferralActions } from "@/features/admin/components/admin-dashboard-actions";
import { getAdminDashboard } from "@/features/admin/queries/get-admin-dashboard";
import { getAdminUserId } from "@/features/admin/lib/require-admin";
import { AdminDashboardCharts } from "@/features/admin/components/admin-dashboard-charts";
import { CountryDistributionChart } from "@/features/admin/components/country-distribution-chart";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
	const adminUserId = await getAdminUserId();
	if (!adminUserId) redirect("/");

	const { q = "" } = await searchParams;
	const { referrals, accounts, auditHistory } = await getAdminDashboard(q);
	const pendingCount = referrals.filter((referral) => referral.status === "pending").length;
	const verifiedCount = accounts.filter((account) => account.verified).length;
	const inactiveCount = accounts.filter((account) => !account.isActive).length;

	return (
		<main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-8">
			<header className="space-y-2">
				<p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Administration</p>
				<h1 className="text-3xl font-semibold tracking-tight">Platform overview</h1>
				<p className="text-sm text-muted-foreground">Manage verification, accounts, map visibility, and audit history.</p>
			</header>

			<section className="grid gap-4 sm:grid-cols-3">
				<div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Pending referrals</p><p className="mt-2 text-2xl font-semibold">{pendingCount}</p></div>
				<div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Verified profiles</p><p className="mt-2 text-2xl font-semibold">{verifiedCount}</p></div>
				<div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Inactive accounts</p><p className="mt-2 text-2xl font-semibold">{inactiveCount}</p></div>
			</section>

			<AdminDashboardCharts referrals={referrals} accounts={accounts} auditHistory={auditHistory} />

			<section className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold">Member snapshot</h2>
					<p className="text-sm text-muted-foreground">Filter the verified mentor pool the same way visitors filter the map.</p>
				</div>
				<CountryDistributionChart />
			</section>

			<section className="space-y-4">
				<div><h2 className="text-xl font-semibold">Verification management</h2><p className="text-sm text-muted-foreground">Review all mentor referrals and override decisions with an audit reason.</p></div>
				<div className="overflow-x-auto rounded-xl border border-border bg-card">
					<table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Mentor</th><th className="px-4 py-3">Referee</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>
						{referrals.map((referral) => <tr key={referral.id} className="border-b border-border last:border-0"><td className="px-4 py-3"><p className="font-medium">{referral.mentorName ?? "Unnamed"}</p><p className="text-xs text-muted-foreground">{referral.mentorEmail}</p></td><td className="px-4 py-3 text-muted-foreground">{referral.refereeEmail}</td><td className="px-4 py-3 capitalize">{referral.status}</td><td className="px-4 py-3">{referral.mentorActive ? "Active" : "Inactive"} · {referral.mentorVerified ? "Verified" : "Unverified"}</td><td className="px-4 py-3"><AdminReferralActions referralId={referral.id} status={referral.status} /></td></tr>)}
					</tbody></table>
					{referrals.length === 0 && <p className="p-6 text-sm text-muted-foreground">No referral records found.</p>}
				</div>
			</section>

			<section className="space-y-4">
				<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-xl font-semibold">Users and profiles</h2><p className="text-sm text-muted-foreground">Search accounts and manage activity or public mentor visibility.</p></div><form className="flex gap-2" method="get"><input name="q" defaultValue={q} placeholder="Search name or email" className="h-8 rounded-lg border border-input bg-background px-3 text-sm" /><button className="h-8 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground" type="submit">Search</button></form></div>
				<div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Profile</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>
					{accounts.map((account) => <tr key={account.id} className="border-b border-border last:border-0"><td className="px-4 py-3"><p className="font-medium">{account.name ?? "Unnamed"}</p><p className="text-xs text-muted-foreground">{account.email}</p></td><td className="px-4 py-3 capitalize">{account.role ?? "No profile"}</td><td className="px-4 py-3">{account.isActive ? "Active" : "Inactive"}{account.role === "mentor" ? ` · ${account.verified ? "Verified" : "Unverified"} · ${account.visibleOnMap ? "On map" : "Hidden"}` : ""}</td><td className="px-4 py-3"><AdminDashboardActions userId={account.id} isActive={account.isActive} verified={Boolean(account.verified)} visibleOnMap={Boolean(account.visibleOnMap)} /></td></tr>)}
				</tbody></table></div>
			</section>

			<section className="space-y-4"><div><h2 className="text-xl font-semibold">Audit history</h2><p className="text-sm text-muted-foreground">Append-only records of sensitive profile and moderation actions.</p></div><div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Reason</th></tr></thead><tbody>{auditHistory.map((event) => <tr key={event.id} className="border-b border-border last:border-0"><td className="px-4 py-3 text-xs text-muted-foreground">{event.createdAt.toLocaleString()}</td><td className="px-4 py-3">{event.action}</td><td className="px-4 py-3 text-xs">{event.entityType}</td><td className="px-4 py-3 text-xs">{event.actorName ?? event.actorEmail ?? "System"}</td><td className="max-w-xs truncate px-4 py-3 text-xs text-muted-foreground">{typeof event.metadata === "object" && event.metadata && "reason" in event.metadata ? String(event.metadata.reason) : "-"}</td></tr>)}</tbody></table>{auditHistory.length === 0 && <p className="p-6 text-sm text-muted-foreground">No audit events yet.</p>}</div></section>
		</main>
	);
}
