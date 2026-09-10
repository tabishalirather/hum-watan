"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { profiles } from "@/db/schema/profiles";
import { mentorReferrals } from "@/db/schema/referrals";
import { mentorRegisterSchema, type MentorRegisterInput } from "@/features/auth/validators/auth-schema";
import { isMentorCapable } from "@/features/auth/lib/roles";

export async function registerMentor(input: MentorRegisterInput) {
  const parsed = mentorRegisterSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid registration details." };
  const data = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(users.email, data.email) });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const referee = await db.query.users.findFirst({ where: eq(users.email, data.refereeEmail) });
  const refereeProfile = referee
    ? await db.query.profiles.findFirst({ where: eq(profiles.userId, referee.id) })
    : undefined;

  if (!referee || !refereeProfile || !isMentorCapable(refereeProfile.role)) {
    return { error: "The referee must already be a registered mentor." };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  // Future-only fallback token: email delivery will be re-enabled after a
  // verified sending domain is configured.
  const token = randomUUID();

  try {
    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ name: data.name, email: data.email, passwordHash })
        .returning();

      await tx.insert(profiles).values({ userId: user.id, role: "mentor", verified: false });
      await tx.insert(mentorReferrals).values({
        mentorUserId: user.id,
        refereeEmail: data.refereeEmail,
        refereeUserId: referee.id,
        token,
      });
    });
  } catch (error) {
    console.error("Failed to create mentor referral", error);
    return { error: "We could not create your mentor account. Please try again later." };
  }

  return { success: true };
}
