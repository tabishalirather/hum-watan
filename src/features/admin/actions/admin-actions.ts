"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { auditEvents } from "@/db/schema/audit";
import { profiles } from "@/db/schema/profiles";
import { mentorReferrals } from "@/db/schema/referrals";
import { siteSettings } from "@/db/schema/site-settings";
import { users } from "@/db/schema/auth";
import { getAdminUserId } from "@/features/admin/lib/require-admin";
import { getAdminEmailPolicyError } from "@/features/admin/lib/admin-email-policy";

const reasonSchema = z.string().trim().min(3, "A reason is required.").max(500);

export async function promoteUserToAdmin(userId: string, reason: string) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) return { error: "Only administrators can promote users." };
  const parsedReason = reasonSchema.safeParse(reason);
  if (!parsedReason.success) return { error: parsedReason.error.issues[0]?.message };

  const candidate = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!candidate) return { error: "User not found." };
  const emailError = getAdminEmailPolicyError(candidate.email);
  if (emailError) return { error: emailError };

  await db.transaction(async (tx) => {
    await tx.update(profiles).set({ role: "admin" }).where(eq(profiles.userId, userId));
    await tx.insert(auditEvents).values({
      actorUserId: adminUserId,
      action: "user_promoted_to_admin",
      entityType: "user",
      entityId: userId,
      metadata: { reason: parsedReason.data },
    });
  });

  return { success: true };
}

export async function setUserActive(userId: string, isActive: boolean, reason: string) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) return { error: "Only administrators can manage users." };
  const parsedReason = reasonSchema.safeParse(reason);
  if (!parsedReason.success) return { error: parsedReason.error.issues[0]?.message };
  if (userId === adminUserId && !isActive) return { error: "You cannot deactivate your own admin account." };

  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .update(users)
      .set({ isActive })
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    if (!user) return false;

    await tx.insert(auditEvents).values({
      actorUserId: adminUserId,
      action: isActive ? "user_reactivated" : "user_deactivated",
      entityType: "user",
      entityId: userId,
      metadata: { reason: parsedReason.data },
    });
    return true;
  });

  return result ? { success: true } : { error: "User not found." };
}

export async function setMentorMapVisibility(userId: string, visibleOnMap: boolean, reason: string) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) return { error: "Only administrators can manage map visibility." };
  const parsedReason = reasonSchema.safeParse(reason);
  if (!parsedReason.success) return { error: parsedReason.error.issues[0]?.message };

  const result = await db.transaction(async (tx) => {
    const [profile] = await tx
      .update(profiles)
      .set({ visibleOnMap })
      .where(and(eq(profiles.userId, userId), eq(profiles.role, "mentor")))
      .returning({ userId: profiles.userId });
    if (!profile) return false;

    await tx.insert(auditEvents).values({
      actorUserId: adminUserId,
      action: visibleOnMap ? "mentor_map_visibility_enabled" : "mentor_map_visibility_disabled",
      entityType: "profile",
      entityId: userId,
      metadata: { reason: parsedReason.data },
    });
    return true;
  });

  return result ? { success: true } : { error: "Mentor profile not found." };
}

export async function overrideMentorVerification(
  referralId: string,
  decision: "confirmed" | "rejected",
  reason: string,
) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) return { error: "Only administrators can override verification." };
  const parsedReason = reasonSchema.safeParse(reason);
  if (!parsedReason.success) return { error: parsedReason.error.issues[0]?.message };

  const result = await db.transaction(async (tx) => {
    const [referral] = await tx
      .update(mentorReferrals)
      .set({
        status: decision,
        reviewedAt: new Date(),
        confirmedAt: decision === "confirmed" ? new Date() : null,
      })
      .where(eq(mentorReferrals.id, referralId))
      .returning({ id: mentorReferrals.id, mentorUserId: mentorReferrals.mentorUserId });
    if (!referral) return false;

    await tx.update(profiles).set({ verified: decision === "confirmed" }).where(eq(profiles.userId, referral.mentorUserId));
    await tx.insert(auditEvents).values({
      actorUserId: adminUserId,
      action: decision === "confirmed" ? "admin_verification_override_approved" : "admin_verification_override_rejected",
      entityType: "mentor_referral",
      entityId: referral.id,
      metadata: { reason: parsedReason.data },
    });
    return true;
  });

  return result ? { success: true } : { error: "Referral not found." };
}

export async function revokeMentorVerification(userId: string, reason: string) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) return { error: "Only administrators can revoke verification." };
  const parsedReason = reasonSchema.safeParse(reason);
  if (!parsedReason.success) return { error: parsedReason.error.issues[0]?.message };

  const result = await db.transaction(async (tx) => {
    const [profile] = await tx
      .update(profiles)
      .set({ verified: false })
      .where(and(eq(profiles.userId, userId), eq(profiles.role, "mentor")))
      .returning({ userId: profiles.userId });
    if (!profile) return false;

    await tx.insert(auditEvents).values({
      actorUserId: adminUserId,
      action: "admin_mentor_verification_revoked",
      entityType: "profile",
      entityId: userId,
      metadata: { reason: parsedReason.data },
    });
    return true;
  });

  return result ? { success: true } : { error: "Mentor profile not found." };
}

export async function setMenteeMessageRateLimit(enabled: boolean) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) return { error: "Only administrators can manage message settings." };

  await db
    .insert(siteSettings)
    .values({ id: 1, menteeMessageRateLimitEnabled: enabled })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: { menteeMessageRateLimitEnabled: enabled },
    });

  return { success: true };
}
