import { and, count, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { messages } from "@/db/schema/messages";

// Per-connection activity for the Connected list: the most recent message
// (so the list can preview it and sort by it, like a normal inbox) plus how
// many of the other party's messages the viewer hasn't opened the thread
// for yet.
export async function getConnectionActivity(chatRequestIds: string[], viewerId: string) {
  const activity = new Map<
    string,
    { lastMessage: { body: string; senderId: string; createdAt: Date } | null; unreadCount: number }
  >();
  for (const id of chatRequestIds) activity.set(id, { lastMessage: null, unreadCount: 0 });

  if (chatRequestIds.length === 0) return activity;

  const [lastMessages, unreadCounts] = await Promise.all([
    db
      .selectDistinctOn([messages.chatRequestId], {
        chatRequestId: messages.chatRequestId,
        senderId: messages.senderId,
        body: messages.body,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.chatRequestId, chatRequestIds))
      .orderBy(messages.chatRequestId, desc(messages.createdAt)),
    db
      .select({ chatRequestId: messages.chatRequestId, unreadCount: count() })
      .from(messages)
      .where(
        and(
          inArray(messages.chatRequestId, chatRequestIds),
          ne(messages.senderId, viewerId),
          isNull(messages.readAt),
        ),
      )
      .groupBy(messages.chatRequestId),
  ]);

  for (const row of lastMessages) {
    activity.set(row.chatRequestId, {
      lastMessage: { body: row.body, senderId: row.senderId, createdAt: row.createdAt },
      unreadCount: activity.get(row.chatRequestId)?.unreadCount ?? 0,
    });
  }
  for (const row of unreadCounts) {
    const entry = activity.get(row.chatRequestId);
    if (entry) entry.unreadCount = row.unreadCount;
  }

  return activity;
}
