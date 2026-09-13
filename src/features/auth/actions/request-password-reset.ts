"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { passwordResetTokens, users } from "@/db/schema/auth";
import { auditEvents } from "@/db/schema/audit";
import {
  requestPasswordResetSchema,
  type RequestPasswordResetInput,
} from "@/features/auth/validators/auth-schema";
import {
  generatePasswordResetToken,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "@/features/auth/lib/password-reset-token";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mailer";

const GENERIC_RESPONSE = {
  success: true,
  message: "If an account exists for that email, we've sent a link to reset the password.",
};

export async function requestPasswordReset(input: RequestPasswordResetInput) {
  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid email address." };
  const { email } = parsed.data;

  const rateLimit = checkRateLimit(`password-reset:${email.toLowerCase()}`, 3, 60 * 60 * 1000);
  if (!rateLimit.allowed) return GENERIC_RESPONSE;

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || !user.isActive) return GENERIC_RESPONSE;

  const { token, tokenHash } = generatePasswordResetToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

  await db.transaction(async (tx) => {
    await tx.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });
    await tx.insert(auditEvents).values({
      actorUserId: user.id,
      action: "password_reset_requested",
      entityType: "user",
      entityId: user.id,
    });
  });

  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
  try {
    await sendMail(
      user.email,
      "Reset your Hum Watan password",
      `We received a request to reset your password. This link expires in 1 hour and can only be used once:\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
      `<p>We received a request to reset your password. This link expires in 1 hour and can only be used once.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
    );
  } catch (error) {
    console.error("Failed to send password reset email", error);
  }

  return GENERIC_RESPONSE;
}
