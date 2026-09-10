"use server";

import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { profiles } from "@/db/schema/profiles";
import { chatRequests } from "@/db/schema/chat-requests";
import { siteSettings } from "@/db/schema/site-settings";
import { sendChatRequestSchema } from "@/features/chat-requests/validators/chat-request-schema";

export async function sendChatRequest(input: { mentorUserId: string; message?: string }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in to request contact." };

  const parsed = sendChatRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid request." };
  const { mentorUserId: recipientUserId, message } = parsed.data;

  if (recipientUserId === session.user.id) {
    return { error: "You can't send a chat request to yourself." };
  }

  const requesterProfile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, session.user.id),
  });
  if (!requesterProfile) return { error: "Complete your profile before requesting contact." };

  const recipientProfile = await db.query.profiles.findFirst({
    where: and(
      eq(profiles.userId, recipientUserId),
      eq(profiles.role, "mentor"),
      eq(profiles.verified, true),
      eq(profiles.visibleOnMap, true),
    ),
  });
  const recipientUser = recipientProfile
    ? await db.query.users.findFirst({ where: eq(users.id, recipientUserId) })
    : null;
  if (!recipientProfile || !recipientUser?.isActive) {
    return { error: "This mentor is not available to contact right now." };
  }

  const existing = await db.query.chatRequests.findFirst({
    where: and(
      eq(chatRequests.requesterUserId, session.user.id),
      eq(chatRequests.recipientUserId, recipientUserId),
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

  const [settings] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1));

  await db.insert(chatRequests).values({
    requesterUserId: session.user.id,
    recipientUserId,
    message: settings?.contactRequestMessageEnabled ? message || null : null,
  });

  return { success: true };
}
