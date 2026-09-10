"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { profiles } from "@/db/schema/profiles";
import { mentorReferrals } from "@/db/schema/referrals";
import { auditEvents } from "@/db/schema/audit";
import { isAlwaysVerified, isMentorCapable } from "@/features/auth/lib/roles";

export async function reviewMentorReferral(
  referralId: string,
  decision: "confirmed" | "rejected",
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in to review referrals." };

  const refereeProfile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, session.user.id),
  });
  const isVerified = refereeProfile && (isAlwaysVerified(refereeProfile.role) || refereeProfile.verified);
  if (!refereeProfile || !isMentorCapable(refereeProfile.role) || !isVerified) {
    return { error: "Only verified mentors can review referrals." };
  }

  return db.transaction(async (tx) => {
    const [referral] = await tx
      .update(mentorReferrals)
      .set({
        status: decision,
        reviewedAt: new Date(),
        confirmedAt: decision === "confirmed" ? new Date() : null,
      })
      .where(
        and(
          eq(mentorReferrals.id, referralId),
          eq(mentorReferrals.refereeUserId, session.user.id),
          eq(mentorReferrals.status, "pending"),
        ),
      )
      .returning({ mentorUserId: mentorReferrals.mentorUserId });

    if (!referral) return { error: "This referral is no longer pending." };

    if (decision === "confirmed") {
      await tx
        .update(profiles)
        .set({ verified: true })
        .where(eq(profiles.userId, referral.mentorUserId));
    }

    await tx.insert(auditEvents).values({
      actorUserId: session.user.id,
      action: decision === "confirmed" ? "mentor_referral_approved" : "mentor_referral_rejected",
      entityType: "mentor_referral",
      entityId: referralId,
    });

    return { success: true };
  });
}
