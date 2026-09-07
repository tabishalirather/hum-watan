type Referral = {
  status: "pending" | "confirmed" | "rejected";
};

type Account = {
  role: "mentee" | "mentor" | "admin" | null;
  isActive: boolean;
  verified: boolean | null;
  visibleOnMap: boolean | null;
};

type AuditEvent = {
  action: string;
};

const REFERRAL_STYLES = {
  pending: { label: "Pending", color: "#d97706" },
  confirmed: { label: "Approved", color: "#059669" },
  rejected: { label: "Rejected", color: "#e11d48" },
} as const;

export function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = total > 0 ? Math.max((value / total) * 100, value > 0 ? 4 : 0) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function AdminDashboardCharts({
  referrals,
  accounts,
  auditHistory,
}: {
  referrals: Referral[];
  accounts: Account[];
  auditHistory: AuditEvent[];
}) {
  const referralCounts = {
    pending: referrals.filter((referral) => referral.status === "pending").length,
    confirmed: referrals.filter((referral) => referral.status === "confirmed").length,
    rejected: referrals.filter((referral) => referral.status === "rejected").length,
  };
  const referralTotal = referrals.length;
  const circumference = 2 * Math.PI * 42;
  let offset = 0;

  const roleCounts = {
    mentor: accounts.filter((account) => account.role === "mentor").length,
    mentee: accounts.filter((account) => account.role === "mentee").length,
    admin: accounts.filter((account) => account.role === "admin").length,
  };
  const activeCount = accounts.filter((account) => account.isActive).length;
  const visibleCount = accounts.filter((account) => account.role === "mentor" && account.visibleOnMap).length;

  const auditCounts = auditHistory.reduce<Record<string, number>>((counts, event) => {
    counts[event.action] = (counts[event.action] ?? 0) + 1;
    return counts;
  }, {});
  const topAuditActions = Object.entries(auditCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
  const maxAuditCount = Math.max(...topAuditActions.map(([, count]) => count), 1);

  return (
    <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr_1fr]">
      <ChartCard title="Referral health" subtitle="Verification decisions across mentor nominations">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Referral health</h2>
            <p className="mt-1 text-xs text-muted-foreground">All mentor verification decisions</p>
          </div>
          <span className="text-2xl font-semibold">{referralTotal}</span>
        </div>
        <div className="mt-5 flex items-center gap-5">
          <div className="relative size-40 shrink-0">
            <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label="Referral status chart">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted" />
              {referralTotal > 0 && (Object.keys(REFERRAL_STYLES) as Array<keyof typeof REFERRAL_STYLES>).map((status) => {
                const length = (referralCounts[status] / referralTotal) * circumference;
                const circle = (
                  <circle
                    key={status}
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={REFERRAL_STYLES[status].color}
                    strokeWidth="10"
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += length;
                return circle;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold tracking-tight">{referralTotal}</span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">total</span>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            {(Object.keys(REFERRAL_STYLES) as Array<keyof typeof REFERRAL_STYLES>).map((status) => (
              <div key={status} className="flex items-center justify-between border-b border-border/70 pb-3 text-sm last:border-0 last:pb-0">
                <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: REFERRAL_STYLES[status].color }} />{REFERRAL_STYLES[status].label}</span>
                <span className="text-lg font-semibold text-foreground">{referralCounts[status]}</span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>

      <ChartCard title="Account mix" subtitle="Roles in the current account set">
        <div className="flex h-44 items-end justify-around gap-5 border-b border-border px-2 pt-4">
          {([["Mentors", roleCounts.mentor, "#0f766e"], ["Mentees", roleCounts.mentee, "#2563eb"], ["Admins", roleCounts.admin, "#7c3aed"]] as const).map(([label, value, color]) => <div key={label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-sm font-semibold">{value}</span><div className="w-full max-w-12 rounded-t-lg" style={{ height: `${Math.max((value / Math.max(...Object.values(roleCounts), 1)) * 78, value > 0 ? 8 : 2)}%`, backgroundColor: color }} /><span className="pb-3 text-[11px] text-muted-foreground">{label}</span></div>)}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div className="rounded-lg bg-muted/60 p-3"><p className="text-muted-foreground">Active accounts</p><p className="mt-1 text-xl font-semibold">{activeCount}</p></div><div className="rounded-lg bg-muted/60 p-3"><p className="text-muted-foreground">Mentors on map</p><p className="mt-1 text-xl font-semibold">{visibleCount}</p></div></div>
      </ChartCard>

      <ChartCard title="Audit activity" subtitle="Most frequent recent actions">
        {topAuditActions.length > 0 ? <div className="space-y-4">{topAuditActions.map(([action, count]) => <div key={action} className="space-y-1.5"><div className="flex items-center justify-between gap-3 text-xs"><span className="truncate capitalize text-muted-foreground">{action.replaceAll("_", " ")}</span><span className="font-semibold">{count}</span></div><div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-cyan-600" style={{ width: `${Math.max((count / maxAuditCount) * 100, 5)}%` }} /></div></div>)}</div> : <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">No audit activity yet.</div>}
      </ChartCard>
    </section>
  );
}