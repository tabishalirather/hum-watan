import { and, count, countDistinct, eq, gt, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db/client";
import { chatRequests } from "@/db/schema/chat-requests";
import { messages } from "@/db/schema/messages";
import { profiles } from "@/db/schema/profiles";

// Nav badge for Connections: pending requests waiting on this user's review,
// new accepted connections they haven't opened the Connections tab since,
// and how many distinct people have sent them a message they haven't read
// yet (not a raw message count).
export async function getUnreadConnectionsCount(userId: string) {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
  const viewedAt = profile?.connectionsViewedAt ?? new Date(0);

  const isParticipant = or(eq(chatRequests.requesterUserId, userId), eq(chatRequests.recipientUserId, userId));

  const [{ pendingReceived }] = await db
    .select({ pendingReceived: count() })
    .from(chatRequests)
    .where(and(eq(chatRequests.recipientUserId, userId), eq(chatRequests.status, "pending")));

  const [{ newConnections }] = await db
    .select({ newConnections: count() })
    .from(chatRequests)
    .where(and(isParticipant, eq(chatRequests.status, "accepted"), gt(chatRequests.reviewedAt, viewedAt)));

  const [{ newMessageThreads }] = await db
    .select({ newMessageThreads: countDistinct(messages.chatRequestId) })
    .from(messages)
    .innerJoin(chatRequests, eq(chatRequests.id, messages.chatRequestId))
    .where(
      and(
        isParticipant,
        eq(chatRequests.status, "accepted"),
        ne(messages.senderId, userId),
        isNull(messages.readAt),
      ),
    );

  return { pendingReceived, newConnections, newMessageThreads };
}
