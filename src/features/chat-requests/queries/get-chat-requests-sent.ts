import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { chatRequests } from "@/db/schema/chat-requests";

export async function getPendingChatRequestsSent(requesterUserId: string) {
  return db
    .select({
      id: chatRequests.id,
      recipientName: users.name,
      recipientEmail: users.email,
      message: chatRequests.message,
      createdAt: chatRequests.createdAt,
    })
    .from(chatRequests)
    .innerJoin(users, eq(users.id, chatRequests.recipientUserId))
    .where(and(eq(chatRequests.requesterUserId, requesterUserId), eq(chatRequests.status, "pending")));
}

export async function getArchivedChatRequestsSent(requesterUserId: string) {
  return db
    .select({
      id: chatRequests.id,
      recipientName: users.name,
      recipientEmail: users.email,
      message: chatRequests.message,
      createdAt: chatRequests.createdAt,
      status: chatRequests.status,
      reviewedAt: chatRequests.reviewedAt,
    })
    .from(chatRequests)
    .innerJoin(users, eq(users.id, chatRequests.recipientUserId))
    .where(
      and(
        eq(chatRequests.requesterUserId, requesterUserId),
        inArray(chatRequests.status, ["rejected", "cancelled"]),
      ),
    );
}
