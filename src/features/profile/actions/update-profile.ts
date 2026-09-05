"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { profiles } from "@/db/schema/profiles";
import { profileSchema, type ProfileInput } from "@/features/profile/validators/profile-schema";

export async function updateProfile(input: ProfileInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in to update your profile." };

  const data = profileSchema.safeParse(input);
  if (!data.success) return { error: data.error.issues[0]?.message ?? "Invalid profile details." };

  const [profile] = await db
    .update(profiles)
    .set({
      subject: data.data.subject,
      degreeLevel: data.data.degreeLevel,
      universityId: data.data.universityId,
      bio: data.data.bio || null,
    })
    .where(eq(profiles.userId, session.user.id))
    .returning({ userId: profiles.userId });

  if (!profile) return { error: "We could not find your profile." };
  return { success: true };
}
