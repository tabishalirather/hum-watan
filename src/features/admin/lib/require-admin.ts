import { auth } from "@/auth";
import { db } from "@/db/client";
import { profiles } from "@/db/schema/profiles";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema/auth";
import { isAllowedAdminEmail } from "@/features/admin/lib/admin-email-policy";

export async function getAdminUserId() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [admin] = await db
    .select({ role: profiles.role, isActive: users.isActive, email: users.email })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(eq(profiles.userId, session.user.id));

  return admin?.role === "admin" && admin.isActive && isAllowedAdminEmail(admin.email)
    ? session.user.id
    : null;
}
