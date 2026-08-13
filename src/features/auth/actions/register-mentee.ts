"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { profiles } from "@/db/schema/profiles";
import { menteeRegisterSchema, type MenteeRegisterInput } from "@/features/auth/validators/auth-schema";

export async function registerMentee(input: MenteeRegisterInput) {
  const data = menteeRegisterSchema.parse(input);

  const existing = await db.query.users.findFirst({ where: eq(users.email, data.email) });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const [user] = await db
    .insert(users)
    .values({ name: data.name, email: data.email, passwordHash })
    .returning();

  await db.insert(profiles).values({ userId: user.id, role: "mentee", verified: true });

  return { success: true };
}
