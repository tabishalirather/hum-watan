"use server";

import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { passwordResetTokens, users } from "@/db/schema/auth";
import { auditEvents } from "@/db/schema/audit";
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/validators/auth-schema";
import { hashPasswordResetToken } from "@/features/auth/lib/password-reset-token";

export async function resetPassword(input: ResetPasswordInput) {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid request." };
  const { token, password } = parsed.data;

  const tokenHash = hashPasswordResetToken(token);
  const record = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, new Date()),
    ),
  });
  if (!record) return { error: "This reset link is invalid or has expired. Please request a new one." };

  const passwordHash = await bcrypt.hash(password, 10);

  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, record.userId));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));
    await tx.insert(auditEvents).values({
      actorUserId: record.userId,
      action: "password_reset_completed",
      entityType: "user",
      entityId: record.userId,
    });
  });

  return { success: true };
}
