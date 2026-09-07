"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { mentorReferrals } from "@/db/schema/referrals";
import { profiles } from "@/db/schema/profiles";
import { auditEvents } from "@/db/schema/audit";

export async function confirmReferral(token: string) {
  // Future-only fallback: this route will be used again when a verified sending
  // domain is configured and email confirmation is re-enabled.
  return db.transaction(async (tx) => {
    const [referral] = await tx
      .update(mentorReferrals)
      .set({ status: "confirmed", reviewedAt: new Date(), confirmedAt: new Date() })
      .where(
        and(
          eq(mentorReferrals.token, token),
          eq(mentorReferrals.status, "pending"),
        ),
      )
      .returning({ id: mentorReferrals.id, mentorUserId: mentorReferrals.mentorUserId });

    if (!referral) return { error: "This confirmation link is invalid or already resolved." };

    await tx
      .update(profiles)
      .set({ verified: true })
      .where(eq(profiles.userId, referral.mentorUserId));

    await tx.insert(auditEvents).values({
      action: "mentor_referral_token_confirmed",
      entityType: "mentor_referral",
      entityId: referral.id,
    });

    return { success: true };
  });
}
