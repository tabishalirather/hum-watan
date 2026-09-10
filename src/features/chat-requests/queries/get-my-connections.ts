import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { profiles } from "@/db/schema/profiles";
import { chatRequests } from "@/db/schema/chat-requests";

// Accepted requests this user sent - the other party is always a mentor
// (the only role listed on the map).
export async function getConnectionsSent(requesterUserId: string) {
  return db
    .select({
      requestId: chatRequests.id,
      otherUserId: chatRequests.recipientUserId,
      otherName: users.name,
      otherEmail: users.email,
      otherRole: profiles.role,
      connectedAt: chatRequests.reviewedAt,
    })
    .from(chatRequests)
    .innerJoin(users, eq(users.id, chatRequests.recipientUserId))
    .innerJoin(profiles, eq(profiles.userId, chatRequests.recipientUserId))
    .where(and(eq(chatRequests.requesterUserId, requesterUserId), eq(chatRequests.status, "accepted")))
    .orderBy(desc(chatRequests.reviewedAt));
}

// Accepted requests this user received - the other party can be a mentee
// or another mentor now that mentors can network with each other.
export async function getConnectionsReceived(recipientUserId: string) {
  return db
    .select({
      requestId: chatRequests.id,
      otherUserId: chatRequests.requesterUserId,
      otherName: users.name,
      otherEmail: users.email,
      otherRole: profiles.role,
      connectedAt: chatRequests.reviewedAt,
    })
    .from(chatRequests)
    .innerJoin(users, eq(users.id, chatRequests.requesterUserId))
    .innerJoin(profiles, eq(profiles.userId, chatRequests.requesterUserId))
    .where(and(eq(chatRequests.recipientUserId, recipientUserId), eq(chatRequests.status, "accepted")))
    .orderBy(desc(chatRequests.reviewedAt));
}
