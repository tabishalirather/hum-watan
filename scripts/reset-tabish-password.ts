import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { users } from "../src/db/schema/auth";

async function main() {
  const email = "tabishrather7006@gmail.com";
  const password = "Amst@123456";
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) throw new Error(`No user found for ${email}`);

  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
  console.log(`Password reset for ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
