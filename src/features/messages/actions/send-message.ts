"use server";

import { and, eq, or } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { chatRequests } from "@/db/schema/chat-requests";
import { messages } from "@/db/schema/messages";
import { sendMessageSchema, type SendMessageInput } from "@/features/messages/validators/message-schema";

export async function sendMessage(input: SendMessageInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in to send a message." };

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid message." };
  const { chatRequestId, body } = parsed.data;

  const chatRequest = await db.query.chatRequests.findFirst({
    where: and(
      eq(chatRequests.id, chatRequestId),
      eq(chatRequests.status, "accepted"),
      or(
        eq(chatRequests.requesterUserId, session.user.id),
        eq(chatRequests.recipientUserId, session.user.id),
      ),
    ),
  });
  if (!chatRequest) return { error: "This conversation is not available." };

  await db.insert(messages).values({
    chatRequestId,
    senderId: session.user.id,
    body,
  });

  return { success: true };
}
