import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { chatRequests } from "@/db/schema/chat-requests";

export async function getMyChatRequests(menteeUserId: string) {
  return db
    .select({
      id: chatRequests.id,
      mentorUserId: chatRequests.mentorUserId,
      status: chatRequests.status,
    })
    .from(chatRequests)
    .where(eq(chatRequests.menteeUserId, menteeUserId));
}
