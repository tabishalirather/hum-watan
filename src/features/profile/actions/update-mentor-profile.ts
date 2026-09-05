"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { profiles } from "@/db/schema/profiles";
import {
  mentorProfileSchema,
  type MentorProfileInput,
} from "@/features/profile/validators/mentor-profile-schema";

export async function updateMentorProfile(input: MentorProfileInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in to update your profile." };

  const data = mentorProfileSchema.safeParse(input);
  if (!data.success) return { error: data.error.issues[0]?.message ?? "Invalid profile details." };

  const [profile] = await db
    .update(profiles)
    .set({
      subject: data.data.subject,
      degreeLevel: data.data.degreeLevel,
      universityId: data.data.universityId,
      bio: data.data.bio || null,
      scholarshipStatus: data.data.scholarshipStatus || null,
    })
    .where(and(eq(profiles.userId, session.user.id), eq(profiles.role, "mentor")))
    .returning({ userId: profiles.userId });

  if (!profile) return { error: "We could not find your mentor profile." };
  return { success: true };
}
