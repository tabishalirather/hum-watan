import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { users } from "../src/db/schema/auth";

async function main() {
  const email = "tabishali.rather1@student.univaq.it";
  const password = "Amst@123456";
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });

  if (!user) {
    throw new Error(`No user found for ${email}`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
  console.log(`Password reset successfully for ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
