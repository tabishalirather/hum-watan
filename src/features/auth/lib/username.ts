import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";

export const USERNAME_PREFIX_BY_ROLE = {
  mentor: "wostadh",
  mentee: "cxaath",
  admin: "zyuth",
} as const;

function randomDigits(length: number) {
  let result = "";
  for (let i = 0; i < length; i++) result += Math.floor(Math.random() * 10);
  return result;
}

export async function generateUniqueUsername(role: keyof typeof USERNAME_PREFIX_BY_ROLE) {
  const prefix = USERNAME_PREFIX_BY_ROLE[role];

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `${prefix}_${randomDigits(6)}`;
    const existing = await db.query.users.findFirst({ where: eq(users.username, candidate) });
    if (!existing) return candidate;
  }

  throw new Error("Could not generate a unique username after multiple attempts.");
}
