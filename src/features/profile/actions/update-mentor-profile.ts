"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { profiles } from "@/db/schema/profiles";
import { auditEvents } from "@/db/schema/audit";
import {
  mentorProfileSchema,
  type MentorProfileInput,
} from "@/features/profile/validators/mentor-profile-schema";

export async function updateMentorProfile(input: MentorProfileInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in to update your profile." };

  const data = mentorProfileSchema.safeParse(input);
  if (!data.success) return { error: data.error.issues[0]?.message ?? "Invalid profile details." };

  const profile = await db.transaction(async (tx) => {
    const [updatedProfile] = await tx
      .update(profiles)
      .set({
        subject: data.data.subject,
        degreeLevel: data.data.degreeLevel,
        universityId: data.data.universityId,
        bio: data.data.bio || null,
        scholarshipStatus: data.data.scholarshipStatus || null,
        showUniversity: data.data.showUniversity,
        showCity: data.data.showCity,
        showBio: data.data.showBio,
      })
      .where(and(eq(profiles.userId, session.user.id), eq(profiles.role, "mentor")))
      .returning({ userId: profiles.userId });

    if (updatedProfile) {
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "mentor_profile_updated",
        entityType: "profile",
        entityId: updatedProfile.userId,
        metadata: {
          fields: [
            "subject",
            "degreeLevel",
            "universityId",
            "bio",
            "scholarshipStatus",
            "showUniversity",
            "showCity",
            "showBio",
          ],
        },
      });
    }

    return updatedProfile;
  });

  if (!profile) return { error: "We could not find your mentor profile." };
  return { success: true };
}
