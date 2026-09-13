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

// Notifications are derived from existing rows rather than stored in their
// own table. Each one clears either because the viewer performed the action
// that resolves it, or because a per-user watermark says they have looked:
//
//   messages       -> messages.read_at, cleared by opening the thread
//   a request you
//   must answer    -> chat_requests.status, cleared by accepting/rejecting
//   an outcome on
//   your own
//   request        -> profiles.connections_viewed_at
//   a referral you
//   must review    -> mentor_referrals.status, cleared by reviewing
//   an outcome on
//   your own
//   verification   -> profiles.verifications_viewed_at
//
// The last one needs its own watermark because the referee or an admin
// resolves the referral, never the mentor it concerns, so no action of
// theirs would otherwise clear it.

export const NOTIFICATION_CATEGORIES = ["messages", "connections", "verifications"] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationItem = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  href: string;
  createdAt: Date;
  /** True when the viewer still has to accept, reject or review something. */
  actionRequired?: boolean;
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
  counts: { messages: 0, connections: 0, verifications: 0 },
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

  const connectionsViewedAt = profile.connectionsViewedAt ?? new Date(0);
  const verificationsViewedAt = profile.verificationsViewedAt ?? new Date(0);
  const isParticipant = or(
    eq(chatRequests.requesterUserId, viewerUserId),
    eq(chatRequests.recipientUserId, viewerUserId),
  );

  // Only a verified mentor (or an admin, who is always mentor-capable and
  // always verified) can act on a referral. Anyone else would be sent back
  // to /profile by the Requests page, so never notify them about one.
  const canReviewReferrals =
    isMentorCapable(profile.role) && (isAlwaysVerified(profile.role) || profile.verified);

  const requesterUser = alias(users, "notification_requester");
  const recipientUser = alias(users, "notification_recipient");

  const [
    blockedUserIds,
    unreadMessageRows,
    incomingRequestRows,
    resolvedRequestRows,
    incomingReferralRows,
    ownReferralRows,
  ] = await Promise.all([
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
    // Someone is waiting on you to accept or reject.
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
    // Outcomes: accepted (either side sees it) or rejected (only the person
    // who asked). Cancelled is excluded because the requester cancelled it
    // themselves and the recipient never needs telling.
    db
      .select({
        id: chatRequests.id,
        status: chatRequests.status,
        requesterUserId: chatRequests.requesterUserId,
        recipientUserId: chatRequests.recipientUserId,
        requesterName: requesterUser.name,
        recipientName: recipientUser.name,
        reviewedAt: chatRequests.reviewedAt,
      })
      .from(chatRequests)
      .innerJoin(requesterUser, eq(requesterUser.id, chatRequests.requesterUserId))
      .innerJoin(recipientUser, eq(recipientUser.id, chatRequests.recipientUserId))
      .where(and(isParticipant, inArray(chatRequests.status, ["accepted", "rejected"])))
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
            and(eq(mentorReferrals.refereeUserId, viewerUserId), eq(mentorReferrals.status, "pending")),
          )
          .orderBy(desc(mentorReferrals.createdAt))
          .limit(MAX_ROWS_PER_CATEGORY)
      : Promise.resolve([]),
    // The decision on your own mentor nomination. Covers a referee approving
    // or rejecting it and an admin overriding it, since both write this row.
    db
      .select({
        id: mentorReferrals.id,
        status: mentorReferrals.status,
        refereeEmail: mentorReferrals.refereeEmail,
        reviewedAt: mentorReferrals.reviewedAt,
      })
      .from(mentorReferrals)
      .where(
        and(
          eq(mentorReferrals.mentorUserId, viewerUserId),
          inArray(mentorReferrals.status, ["confirmed", "rejected"]),
        ),
      )
      .orderBy(desc(mentorReferrals.reviewedAt))
      .limit(MAX_ROWS_PER_CATEGORY),
  ]);

  // One notification per thread rather than per message, matching the
  // distinct-people counting the old Connections badge used.
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

  const connectionItems: NotificationItem[] = incomingRequestRows
    .filter((row) => !blockedUserIds.has(row.requesterUserId))
    .map((row) => ({
      id: `request:${row.id}`,
      category: "connections" as const,
      title: row.requesterName ?? "Unnamed user",
      body: row.message ? truncate(row.message) : "Wants to connect with you.",
      href: "/connections",
      createdAt: row.createdAt,
      actionRequired: true,
    }));

  // An accepted connection stops being news once its thread has any message,
  // because the messages category is then the live signal and showing both
  // would count the same person twice.
  const freshOutcomes = resolvedRequestRows.filter((row) => {
    if (row.reviewedAt === null || row.reviewedAt <= connectionsViewedAt) return false;
    // A rejection is only ever news to the person who asked.
    if (row.status === "rejected" && row.requesterUserId !== viewerUserId) return false;
    const otherUserId =
      row.requesterUserId === viewerUserId ? row.recipientUserId : row.requesterUserId;
    return !blockedUserIds.has(otherUserId);
  });

  const acceptedIds = freshOutcomes.filter((row) => row.status === "accepted").map((row) => row.id);
  const threadsWithMessages = new Set<string>();
  if (acceptedIds.length > 0) {
    const rows = await db
      .selectDistinct({ chatRequestId: messages.chatRequestId })
      .from(messages)
      .where(inArray(messages.chatRequestId, acceptedIds));
    for (const row of rows) threadsWithMessages.add(row.chatRequestId);
  }

  for (const row of freshOutcomes) {
    if (row.status === "accepted" && threadsWithMessages.has(row.id)) continue;

    const viewerIsRequester = row.requesterUserId === viewerUserId;
    const otherName = (viewerIsRequester ? row.recipientName : row.requesterName) ?? "Unnamed user";

    if (row.status === "rejected") {
      connectionItems.push({
        id: `rejected:${row.id}`,
        category: "connections",
        title: otherName,
        body: "Declined your contact request.",
        href: "/connections",
        createdAt: row.reviewedAt as Date,
      });
      continue;
    }

    connectionItems.push({
      id: `connection:${row.id}`,
      category: "connections",
      title: otherName,
      body: viewerIsRequester ? "Accepted your contact request." : "You are now connected. Say hello.",
      href: `/connections/${row.id}`,
      createdAt: row.reviewedAt as Date,
    });
  }

  const verificationItems: NotificationItem[] = incomingReferralRows.map((row) => ({
    id: `referral:${row.id}`,
    category: "verifications" as const,
    title: row.mentorName ?? "Unnamed mentor",
    body: `Listed you as their referee (${row.mentorEmail}).`,
    href: "/requests",
    createdAt: row.createdAt,
    actionRequired: true,
  }));

  for (const row of ownReferralRows) {
    if (row.reviewedAt === null || row.reviewedAt <= verificationsViewedAt) continue;

    verificationItems.push({
      id: `verdict:${row.id}`,
      category: "verifications",
      title: row.status === "confirmed" ? "Mentor verification approved" : "Mentor verification declined",
      body:
        row.status === "confirmed"
          ? "You are now a verified mentor and visible on the map."
          : `Your nomination was not approved by ${row.refereeEmail}.`,
      href: "/profile",
      createdAt: row.reviewedAt,
    });
  }

  const counts: Record<NotificationCategory, number> = {
    messages: messageItems.length,
    connections: connectionItems.length,
    verifications: verificationItems.length,
  };

  const items = [...messageItems, ...connectionItems, ...verificationItems].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return {
    total: counts.messages + counts.connections + counts.verifications,
    counts,
    items: items.slice(0, MAX_ITEMS_RETURNED),
  };
}
