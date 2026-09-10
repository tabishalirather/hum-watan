import "dotenv/config";
import { eq, isNull } from "drizzle-orm";
import { db } from "../src/db/client";
import { users } from "../src/db/schema/auth";
import { profiles } from "../src/db/schema/profiles";
import { generateUniqueUsername } from "../src/features/auth/lib/username";

async function main() {
  const usersWithoutUsername = await db
    .select({ id: users.id, role: profiles.role })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(isNull(users.username));

  for (const user of usersWithoutUsername) {
    const username = await generateUniqueUsername(user.role);
    await db.update(users).set({ username }).where(eq(users.id, user.id));
  }

  console.log(`Backfilled usernames for ${usersWithoutUsername.length} user(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
