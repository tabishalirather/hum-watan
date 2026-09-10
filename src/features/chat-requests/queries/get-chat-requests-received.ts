import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { chatRequests } from "@/db/schema/chat-requests";

export async function getPendingChatRequestsReceived(recipientUserId: string) {
  return db
    .select({
      id: chatRequests.id,
      requesterName: users.name,
      requesterEmail: users.email,
      message: chatRequests.message,
      createdAt: chatRequests.createdAt,
    })
    .from(chatRequests)
    .innerJoin(users, eq(users.id, chatRequests.requesterUserId))
    .where(and(eq(chatRequests.recipientUserId, recipientUserId), eq(chatRequests.status, "pending")));
}

export async function getArchivedChatRequestsReceived(recipientUserId: string) {
  return db
    .select({
      id: chatRequests.id,
      requesterName: users.name,
      requesterEmail: users.email,
      message: chatRequests.message,
      createdAt: chatRequests.createdAt,
      status: chatRequests.status,
      reviewedAt: chatRequests.reviewedAt,
    })
    .from(chatRequests)
    .innerJoin(users, eq(users.id, chatRequests.requesterUserId))
    .where(
      and(
        eq(chatRequests.recipientUserId, recipientUserId),
        inArray(chatRequests.status, ["rejected", "cancelled"]),
      ),
    );
}
