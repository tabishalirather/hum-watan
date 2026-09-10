"use server";

import { and, eq, ne } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { auditEvents } from "@/db/schema/audit";
import { accountSchema, type AccountInput } from "@/features/profile/validators/account-schema";

export async function updateAccount(input: AccountInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in to update your account." };

  const data = accountSchema.safeParse(input);
  if (!data.success) return { error: data.error.issues[0]?.message ?? "Invalid account details." };

  const emailTaken = await db.query.users.findFirst({
    where: and(eq(users.email, data.data.email), ne(users.id, session.user.id)),
  });
  if (emailTaken) return { error: "An account with this email already exists." };

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ name: data.data.name, email: data.data.email })
      .where(eq(users.id, session.user.id));

    await tx.insert(auditEvents).values({
      actorUserId: session.user.id,
      action: "account_updated",
      entityType: "user",
      entityId: session.user.id,
      metadata: { fields: ["name", "email"] },
    });
  });

  return { success: true };
}
