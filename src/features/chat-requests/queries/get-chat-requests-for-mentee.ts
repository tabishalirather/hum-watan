import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { chatRequests } from "@/db/schema/chat-requests";

export async function getPendingChatRequestsForMentee(menteeUserId: string) {
  return db
    .select({
      id: chatRequests.id,
      mentorName: users.name,
      mentorEmail: users.email,
      message: chatRequests.message,
      createdAt: chatRequests.createdAt,
    })
    .from(chatRequests)
    .innerJoin(users, eq(users.id, chatRequests.mentorUserId))
    .where(and(eq(chatRequests.menteeUserId, menteeUserId), eq(chatRequests.status, "pending")));
}

export async function getArchivedChatRequestsForMentee(menteeUserId: string) {
  return db
    .select({
      id: chatRequests.id,
      mentorName: users.name,
      mentorEmail: users.email,
      message: chatRequests.message,
      createdAt: chatRequests.createdAt,
      status: chatRequests.status,
      reviewedAt: chatRequests.reviewedAt,
    })
    .from(chatRequests)
    .innerJoin(users, eq(users.id, chatRequests.mentorUserId))
    .where(
      and(eq(chatRequests.menteeUserId, menteeUserId), inArray(chatRequests.status, ["rejected", "cancelled"])),
    );
}
