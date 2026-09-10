"use server";

import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { profiles } from "@/db/schema/profiles";
import { chatRequests } from "@/db/schema/chat-requests";
import { sendChatRequestSchema } from "@/features/chat-requests/validators/chat-request-schema";

export async function sendChatRequest(input: { mentorUserId: string; message?: string }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in to request contact." };

  const parsed = sendChatRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid request." };
  const { mentorUserId, message } = parsed.data;

  const menteeProfile = await db.query.profiles.findFirst({
    where: and(eq(profiles.userId, session.user.id), eq(profiles.role, "mentee")),
  });
  if (!menteeProfile) return { error: "Only mentees can request contact with a mentor." };

  const mentor = await db.query.profiles.findFirst({
    where: and(
      eq(profiles.userId, mentorUserId),
      eq(profiles.role, "mentor"),
      eq(profiles.verified, true),
      eq(profiles.visibleOnMap, true),
    ),
  });
  const mentorUser = mentor
    ? await db.query.users.findFirst({ where: eq(users.id, mentorUserId) })
    : null;
  if (!mentor || !mentorUser?.isActive) {
    return { error: "This mentor is not available to contact right now." };
  }

  const existing = await db.query.chatRequests.findFirst({
    where: and(
      eq(chatRequests.menteeUserId, session.user.id),
      eq(chatRequests.mentorUserId, mentorUserId),
      inArray(chatRequests.status, ["pending", "accepted"]),
    ),
  });
  if (existing) {
    return {
      error:
        existing.status === "accepted"
          ? "You're already connected with this mentor."
          : "You already have a pending request with this mentor.",
    };
  }

  await db.insert(chatRequests).values({
    menteeUserId: session.user.id,
    mentorUserId,
    message: message || null,
  });

  return { success: true };
}
