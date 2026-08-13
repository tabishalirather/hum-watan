"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { profiles } from "@/db/schema/profiles";
import { mentorReferrals } from "@/db/schema/referrals";
import { mentorRegisterSchema, type MentorRegisterInput } from "@/features/auth/validators/auth-schema";
import { sendMail } from "@/lib/mailer";

export async function registerMentor(input: MentorRegisterInput) {
  const data = mentorRegisterSchema.parse(input);

  const existing = await db.query.users.findFirst({ where: eq(users.email, data.email) });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const referee = await db.query.users.findFirst({ where: eq(users.email, data.refereeEmail) });
  const refereeProfile = referee
    ? await db.query.profiles.findFirst({
        where: and(eq(profiles.userId, referee.id), eq(profiles.role, "mentor")),
      })
    : undefined;

  if (!referee || !refereeProfile) {
    return { error: "The referee must already be a registered mentor." };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const [user] = await db
    .insert(users)
    .values({ name: data.name, email: data.email, passwordHash })
    .returning();

  await db.insert(profiles).values({ userId: user.id, role: "mentor", verified: false });

  const token = randomUUID();
  await db.insert(mentorReferrals).values({
    mentorUserId: user.id,
    refereeEmail: data.refereeEmail,
    refereeUserId: referee.id,
    token,
  });

  const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/referrals/confirm?token=${token}`;
  await sendMail(
    data.refereeEmail,
    "Confirm mentor nomination",
    `${data.name} listed you as their referee. Confirm this nomination: ${confirmUrl}`,
  );

  return { success: true };
}
