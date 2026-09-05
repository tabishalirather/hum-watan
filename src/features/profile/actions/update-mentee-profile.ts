"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { profiles } from "@/db/schema/profiles";
import {
  menteeProfileSchema,
  type MenteeProfileInput,
} from "@/features/profile/validators/mentee-profile-schema";

export async function updateMenteeProfile(input: MenteeProfileInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in to update your profile." };

  const data = menteeProfileSchema.safeParse(input);
  if (!data.success) return { error: data.error.issues[0]?.message ?? "Invalid profile details." };

  const [profile] = await db
    .update(profiles)
    .set({
      targetPrograms: data.data.targetPrograms,
      background: data.data.background,
      helpNeeded: data.data.helpNeeded,
    })
    .where(and(eq(profiles.userId, session.user.id), eq(profiles.role, "mentee")))
    .returning({ userId: profiles.userId });

  if (!profile) return { error: "We could not find your mentee profile." };
  return { success: true };
}
