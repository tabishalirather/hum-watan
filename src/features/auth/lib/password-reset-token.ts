import { createHash, randomUUID } from "crypto";

export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function generatePasswordResetToken() {
  const token = randomUUID();
  return { token, tokenHash: hashPasswordResetToken(token) };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
