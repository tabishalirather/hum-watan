"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { reviewMentorReferral } from "@/features/auth/actions/review-mentor-referral";
import { Button } from "@/shared/components/ui/button";

type PendingReferral = {
  id: string;
  mentorName: string | null;
  mentorEmail: string;
  createdAt: Date;
};

type ArchivedReferral = PendingReferral & {
  status: "pending" | "confirmed" | "rejected";
  reviewedAt: Date | null;
};

export function MentorReferralApprovals({
  referrals,
  archivedReferrals = [],
  showEmptyState = false,
}: {
  referrals: PendingReferral[];
  archivedReferrals?: ArchivedReferral[];
  showEmptyState?: boolean;
}) {
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);

  if (referrals.length === 0 && archivedReferrals.length === 0 && !showEmptyState) return null;

  const review = async (referralId: string, decision: "confirmed" | "rejected") => {
    const action = decision === "confirmed" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${action} this mentor request?`)) return;

    setMessage(null);
    setPendingIds((current) => [...current, referralId]);
    const result = await reviewMentorReferral(referralId, decision);
    setPendingIds((current) => current.filter((id) => id !== referralId));
    if (result.error) {
      setMessage(result.error);
      return;
    }
    window.location.reload();
  };

  return (
    <section id="mentor-approvals" className="mb-6 rounded-xl border border-sky-300/70 bg-sky-50 px-4 py-4 text-sky-950">
      <div className="mb-3">
        <h2 className="font-semibold">Mentor approvals</h2>
        <p className="mt-1 text-sm leading-6">
          These mentors listed you as their referee. Review their nominations below.
        </p>
      </div>
      {referrals.length === 0 ? (
        <p className="text-sm leading-6 text-sky-800">You have no pending mentor requests.</p>
      ) : (
        <div className="space-y-3">
        {referrals.map((referral) => {
          const isPending = pendingIds.includes(referral.id);
          return (
            <div key={referral.id} className="rounded-lg border border-sky-200 bg-white/80 px-3 py-3">
              <p className="text-sm font-medium">{referral.mentorName ?? "Unnamed mentor"}</p>
              <p className="text-xs text-sky-800">{referral.mentorEmail}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={isPending} onClick={() => review(referral.id, "confirmed")}>
                  <Check />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => review(referral.id, "rejected")}
                >
                  <X />
                  Reject
                </Button>
              </div>
            </div>
          );
        })}
        </div>
      )}
      {message && <p className="mt-3 text-sm text-destructive">{message}</p>}
      {archivedReferrals.length > 0 && (
        <div className="mt-6 border-t border-sky-200 pt-3">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold transition-colors hover:bg-sky-100/70"
            aria-expanded={isArchiveExpanded}
            onClick={() => setIsArchiveExpanded((expanded) => !expanded)}
          >
            <span className="flex items-center gap-2">
              Archived decisions
              <span className="rounded-full bg-sky-200 px-1.5 py-0.5 text-[10px] font-semibold text-sky-900">
                {archivedReferrals.length}
              </span>
            </span>
            <ChevronDown className={`size-4 transition-transform ${isArchiveExpanded ? "rotate-180" : ""}`} />
          </button>
          {isArchiveExpanded && (
            <div className="mt-2 space-y-2">
              {archivedReferrals.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between gap-3 rounded-lg border border-sky-200/80 bg-white/60 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{referral.mentorName ?? "Unnamed mentor"}</p>
                    <p className="text-xs text-sky-800">{referral.mentorEmail}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className={referral.status === "confirmed" ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
                      {referral.status === "confirmed" ? "Approved" : "Rejected"}
                    </p>
                    {referral.reviewedAt && <p className="text-sky-700">{referral.reviewedAt.toLocaleDateString()}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}