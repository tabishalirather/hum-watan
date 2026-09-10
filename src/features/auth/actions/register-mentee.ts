"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { profiles } from "@/db/schema/profiles";
import { menteeRegisterSchema, type MenteeRegisterInput } from "@/features/auth/validators/auth-schema";
import { generateUniqueUsername } from "@/features/auth/lib/username";

export async function registerMentee(input: MenteeRegisterInput) {
  const parsed = menteeRegisterSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid registration details." };
  const data = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(users.email, data.email) });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const username = await generateUniqueUsername("mentee");

  await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ name: data.name, email: data.email, passwordHash, username })
      .returning();

    await tx.insert(profiles).values({ userId: user.id, role: "mentee", verified: true });
  });

  return { success: true };
}
