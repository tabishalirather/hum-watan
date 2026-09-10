import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { chatRequests } from "@/db/schema/chat-requests";

export async function getMyChatRequests(requesterUserId: string) {
  return db
    .select({
      id: chatRequests.id,
      recipientUserId: chatRequests.recipientUserId,
      status: chatRequests.status,
    })
    .from(chatRequests)
    .where(eq(chatRequests.requesterUserId, requesterUserId));
}
