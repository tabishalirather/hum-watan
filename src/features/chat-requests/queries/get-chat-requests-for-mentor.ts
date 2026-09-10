import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { chatRequests } from "@/db/schema/chat-requests";

export async function getPendingChatRequestsForMentor(mentorUserId: string) {
  return db
    .select({
      id: chatRequests.id,
      menteeName: users.name,
      menteeEmail: users.email,
      message: chatRequests.message,
      createdAt: chatRequests.createdAt,
    })
    .from(chatRequests)
    .innerJoin(users, eq(users.id, chatRequests.menteeUserId))
    .where(and(eq(chatRequests.mentorUserId, mentorUserId), eq(chatRequests.status, "pending")));
}

export async function getArchivedChatRequestsForMentor(mentorUserId: string) {
  return db
    .select({
      id: chatRequests.id,
      menteeName: users.name,
      menteeEmail: users.email,
      message: chatRequests.message,
      createdAt: chatRequests.createdAt,
      status: chatRequests.status,
      reviewedAt: chatRequests.reviewedAt,
    })
    .from(chatRequests)
    .innerJoin(users, eq(users.id, chatRequests.menteeUserId))
    .where(
      and(
        eq(chatRequests.mentorUserId, mentorUserId),
        inArray(chatRequests.status, ["accepted", "rejected", "cancelled"]),
      ),
    );
}
