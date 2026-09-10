"use server";

import { and, desc, eq, or, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { chatRequests } from "@/db/schema/chat-requests";
import { messages } from "@/db/schema/messages";
import { profiles } from "@/db/schema/profiles";
import { siteSettings } from "@/db/schema/site-settings";
import { MENTEE_MESSAGE_RATE_LIMIT_ERROR } from "@/features/messages/lib/message-errors";
import { sendMessageSchema, type SendMessageInput } from "@/features/messages/validators/message-schema";
import { areUsersBlocked } from "@/features/moderation/queries/get-block-state";

export async function sendMessage(input: SendMessageInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in to send a message." };

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid message." };
  const { chatRequestId, body } = parsed.data;

  const chatRequest = await db.query.chatRequests.findFirst({
    where: and(
      eq(chatRequests.id, chatRequestId),
      eq(chatRequests.status, "accepted"),
      or(
        eq(chatRequests.requesterUserId, session.user.id),
        eq(chatRequests.recipientUserId, session.user.id),
      ),
    ),
  });
  if (!chatRequest) return { error: "This conversation is not available." };

  const otherUserId =
    chatRequest.requesterUserId === session.user.id ? chatRequest.recipientUserId : chatRequest.requesterUserId;
  if (await areUsersBlocked(session.user.id, otherUserId)) {
    return { error: "You cannot send messages in this conversation." };
  }

  const inserted = await db.transaction(async (tx) => {
    // Serialize sends in one thread so two simultaneous requests cannot both
    // observe the same unanswered-message count.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${chatRequestId}))`);

    const [profile] = await tx
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.userId, session.user.id));
    const [settings] = await tx.select().from(siteSettings).where(eq(siteSettings.id, 1));

    if (settings?.menteeMessageRateLimitEnabled && profile?.role === "mentee") {
      const threadMessages = await tx
        .select({ senderId: messages.senderId })
        .from(messages)
        .where(eq(messages.chatRequestId, chatRequestId))
        .orderBy(desc(messages.createdAt));

      let unansweredMenteeMessages = 0;
      for (const message of threadMessages) {
        if (message.senderId === chatRequest.recipientUserId) break;
        if (message.senderId === session.user.id) unansweredMenteeMessages += 1;
      }

      if (unansweredMenteeMessages >= 2) return false;
    }

    await tx.insert(messages).values({ chatRequestId, senderId: session.user.id, body });
    return true;
  });

  if (!inserted) return { error: MENTEE_MESSAGE_RATE_LIMIT_ERROR };

  return { success: true };
}
