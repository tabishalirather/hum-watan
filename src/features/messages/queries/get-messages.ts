import { and, asc, eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { chatRequests } from "@/db/schema/chat-requests";
import { messages } from "@/db/schema/messages";

export async function getChatRequestForParticipant(chatRequestId: string, viewerId: string) {
  return db.query.chatRequests.findFirst({
    where: and(
      eq(chatRequests.id, chatRequestId),
      or(eq(chatRequests.requesterUserId, viewerId), eq(chatRequests.recipientUserId, viewerId)),
    ),
  });
}

export async function getMessages(chatRequestId: string) {
  return db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      body: messages.body,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.chatRequestId, chatRequestId))
    .orderBy(asc(messages.createdAt));
}
