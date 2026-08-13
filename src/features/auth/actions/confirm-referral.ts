"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { mentorReferrals } from "@/db/schema/referrals";
import { profiles } from "@/db/schema/profiles";

export async function confirmReferral(token: string) {
  const referral = await db.query.mentorReferrals.findFirst({
    where: eq(mentorReferrals.token, token),
  });

  if (!referral) return { error: "This confirmation link is invalid." };
  if (referral.status !== "pending") return { error: "This nomination was already resolved." };

  await db
    .update(mentorReferrals)
    .set({ status: "confirmed", confirmedAt: new Date() })
    .where(eq(mentorReferrals.id, referral.id));

  await db
    .update(profiles)
    .set({ verified: true })
    .where(eq(profiles.userId, referral.mentorUserId));

  return { success: true };
}
