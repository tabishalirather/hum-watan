import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { users } from "../src/db/schema/auth";
import { profiles } from "../src/db/schema/profiles";
import { auditEvents } from "../src/db/schema/audit";

async function main() {
  const email = "tabishrather7006@gmail.com";
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (!user) throw new Error(`No user found for ${email}`);

  await db.transaction(async (tx) => {
    const [profile] = await tx
      .update(profiles)
      .set({ role: "admin" })
      .where(eq(profiles.userId, user.id))
      .returning({ userId: profiles.userId });
    if (!profile) throw new Error("The user does not have a profile.");

    await tx.insert(auditEvents).values({
      action: "user_promoted_to_admin",
      entityType: "user",
      entityId: user.id,
      metadata: { reason: "Initial admin bootstrap" },
    });
  });

  console.log(`Promoted ${email} to admin.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
