import { and, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { profiles } from "@/db/schema/profiles";
import { chatRequests } from "@/db/schema/chat-requests";
import { messages } from "@/db/schema/messages";
import { mentorReferrals } from "@/db/schema/referrals";
import { userBlocks } from "@/db/schema/moderation";
import { isAlwaysVerified, isMentorCapable } from "@/features/auth/lib/roles";

// Notifications are derived from existing state rather than stored in their
// own table. Every category already has a natural "unread" marker that the
// relevant action clears:
//
//   messages      -> messages.read_at, cleared by opening the thread
//   requests      -> chat_requests.status, cleared by accepting/rejecting
//   connections   -> profiles.connections_viewed_at, cleared by visiting
//                    /connections
//   verifications -> mentor_referrals.status, cleared by reviewing
//
// That means opening the panel deliberately clears nothing: an item leaves
// the list when it is acted on, not when it is glanced at.

export const NOTIFICATION_CATEGORIES = [
  "messages",
  "requests",
  "connections",
  "verifications",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationItem = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  href: string;
  createdAt: Date;
  /** Unread messages in this thread. Only set for the messages category. */
  count?: number;
};

export type NotificationsPayload = {
  total: number;
  counts: Record<NotificationCategory, number>;
  items: NotificationItem[];
};

// Guards against one pathological account dragging the whole navbar down.
// Counts are computed before the list is trimmed, so the badge stays honest
// even when the panel does not show every item.
const MAX_ROWS_PER_CATEGORY = 500;
const MAX_ITEMS_RETURNED = 30;

const EMPTY_PAYLOAD: NotificationsPayload = {
  total: 0,
  counts: { messages: 0, requests: 0, connections: 0, verifications: 0 },
  items: [],
};

function truncate(value: string, max = 120) {
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max - 1)}...` : collapsed;
}

async function getBlockedUserIds(viewerUserId: string) {
  const rows = await db
    .select({ blockerUserId: userBlocks.blockerUserId, blockedUserId: userBlocks.blockedUserId })
    .from(userBlocks)
    .where(or(eq(userBlocks.blockerUserId, viewerUserId), eq(userBlocks.blockedUserId, viewerUserId)));

  return new Set(
    rows
      .map((row) => (row.blockerUserId === viewerUserId ? row.blockedUserId : row.blockerUserId))
      .filter((userId) => userId !== viewerUserId),
  );
}

export async function getNotifications(viewerUserId: string): Promise<NotificationsPayload> {
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, viewerUserId) });
  if (!profile) return EMPTY_PAYLOAD;

  const viewedAt = profile.connectionsViewedAt ?? new Date(0);
  const isParticipant = or(
    eq(chatRequests.requesterUserId, viewerUserId),
    eq(chatRequests.recipientUserId, viewerUserId),
  );

  // Only a verified mentor (or an admin, who is always mentor-capable and
  // always verified) can actually act on a referral. Anyone else would be
  // sent straight back to /profile by the Requests page, so never notify
  // them about one.
  const canReviewReferrals =
    isMentorCapable(profile.role) && (isAlwaysVerified(profile.role) || profile.verified);

  const requesterUser = alias(users, "notification_requester");
  const recipientUser = alias(users, "notification_recipient");

  const [blockedUserIds, unreadMessageRows, pendingRequestRows, connectionRows, referralRows] =
    await Promise.all([
      getBlockedUserIds(viewerUserId),
      db
        .select({
          chatRequestId: messages.chatRequestId,
          senderId: messages.senderId,
          senderName: users.name,
          body: messages.body,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .innerJoin(chatRequests, eq(chatRequests.id, messages.chatRequestId))
        .innerJoin(users, eq(users.id, messages.senderId))
        .where(
          and(
            isParticipant,
            eq(chatRequests.status, "accepted"),
            ne(messages.senderId, viewerUserId),
            isNull(messages.readAt),
          ),
        )
        .orderBy(desc(messages.createdAt))
        .limit(MAX_ROWS_PER_CATEGORY),
      db
        .select({
          id: chatRequests.id,
          requesterUserId: chatRequests.requesterUserId,
          requesterName: users.name,
          message: chatRequests.message,
          createdAt: chatRequests.createdAt,
        })
        .from(chatRequests)
        .innerJoin(users, eq(users.id, chatRequests.requesterUserId))
        .where(and(eq(chatRequests.recipientUserId, viewerUserId), eq(chatRequests.status, "pending")))
        .orderBy(desc(chatRequests.createdAt))
        .limit(MAX_ROWS_PER_CATEGORY),
      db
        .select({
          id: chatRequests.id,
          requesterUserId: chatRequests.requesterUserId,
          recipientUserId: chatRequests.recipientUserId,
          requesterName: requesterUser.name,
          recipientName: recipientUser.name,
          reviewedAt: chatRequests.reviewedAt,
        })
        .from(chatRequests)
        .innerJoin(requesterUser, eq(requesterUser.id, chatRequests.requesterUserId))
        .innerJoin(recipientUser, eq(recipientUser.id, chatRequests.recipientUserId))
        .where(and(isParticipant, eq(chatRequests.status, "accepted")))
        .orderBy(desc(chatRequests.reviewedAt))
        .limit(MAX_ROWS_PER_CATEGORY),
      canReviewReferrals
        ? db
            .select({
              id: mentorReferrals.id,
              mentorName: users.name,
              mentorEmail: users.email,
              createdAt: mentorReferrals.createdAt,
            })
            .from(mentorReferrals)
            .innerJoin(users, eq(users.id, mentorReferrals.mentorUserId))
            .where(
              and(
                eq(mentorReferrals.refereeUserId, viewerUserId),
                eq(mentorReferrals.status, "pending"),
              ),
            )
            .orderBy(desc(mentorReferrals.createdAt))
            .limit(MAX_ROWS_PER_CATEGORY)
        : Promise.resolve([]),
    ]);

  // One notification per thread rather than per message, matching the
  // distinct-people counting the Connections badge already used.
  const messageItems: NotificationItem[] = [];
  const seenThreads = new Map<string, NotificationItem>();
  for (const row of unreadMessageRows) {
    if (blockedUserIds.has(row.senderId)) continue;

    const existing = seenThreads.get(row.chatRequestId);
    if (existing) {
      existing.count = (existing.count ?? 1) + 1;
      continue;
    }

    // Rows arrive newest first, so the first one seen for a thread is the
    // latest unread message in it.
    const item: NotificationItem = {
      id: `message:${row.chatRequestId}`,
      category: "messages",
      title: row.senderName ?? "Unnamed user",
      body: truncate(row.body),
      href: `/connections/${row.chatRequestId}`,
      createdAt: row.createdAt,
      count: 1,
    };
    seenThreads.set(row.chatRequestId, item);
    messageItems.push(item);
  }

  const requestItems: NotificationItem[] = pendingRequestRows
    .filter((row) => !blockedUserIds.has(row.requesterUserId))
    .map((row) => ({
      id: `request:${row.id}`,
      category: "requests" as const,
      title: row.requesterName ?? "Unnamed user",
      body: row.message ? truncate(row.message) : "Sent you a contact request.",
      href: "/connections",
      createdAt: row.createdAt,
    }));

  // A connection only counts as news until the thread has any message in it.
  // After that the messages category is the live signal and showing both
  // would double-count the same person.
  const newConnectionRows = connectionRows.filter(
    (row) => row.reviewedAt !== null && row.reviewedAt > viewedAt,
  );
  const threadsWithMessages = new Set<string>();
  if (newConnectionRows.length > 0) {
    const rows = await db
      .selectDistinct({ chatRequestId: messages.chatRequestId })
      .from(messages)
      .where(
        inArray(
          messages.chatRequestId,
          newConnectionRows.map((row) => row.id),
        ),
      );
    for (const row of rows) threadsWithMessages.add(row.chatRequestId);
  }

  const connectionItems: NotificationItem[] = newConnectionRows
    .filter((row) => {
      if (threadsWithMessages.has(row.id)) return false;
      const otherUserId =
        row.requesterUserId === viewerUserId ? row.recipientUserId : row.requesterUserId;
      return !blockedUserIds.has(otherUserId);
    })
    .map((row) => {
      const viewerIsRequester = row.requesterUserId === viewerUserId;
      return {
        id: `connection:${row.id}`,
        category: "connections" as const,
        title: (viewerIsRequester ? row.recipientName : row.requesterName) ?? "Unnamed user",
        body: viewerIsRequester
          ? "Accepted your contact request."
          : "You are now connected. Say hello.",
        href: `/connections/${row.id}`,
        createdAt: row.reviewedAt as Date,
      };
    });

  const verificationItems: NotificationItem[] = referralRows.map((row) => ({
    id: `verification:${row.id}`,
    category: "verifications" as const,
    title: row.mentorName ?? "Unnamed mentor",
    body: `Listed you as their referee (${row.mentorEmail}).`,
    href: "/requests",
    createdAt: row.createdAt,
  }));

  const counts: Record<NotificationCategory, number> = {
    messages: messageItems.length,
    requests: requestItems.length,
    connections: connectionItems.length,
    verifications: verificationItems.length,
  };

  const items = [...messageItems, ...requestItems, ...connectionItems, ...verificationItems].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return {
    total: counts.messages + counts.requests + counts.connections + counts.verifications,
    counts,
    items: items.slice(0, MAX_ITEMS_RETURNED),
  };
}
