"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { chatRequests } from "@/db/schema/chat-requests";

export async function cancelChatRequest(requestId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in to cancel a request." };

  const [request] = await db
    .update(chatRequests)
    .set({ status: "cancelled", reviewedAt: new Date() })
    .where(
      and(
        eq(chatRequests.id, requestId),
        eq(chatRequests.menteeUserId, session.user.id),
        eq(chatRequests.status, "pending"),
      ),
    )
    .returning({ id: chatRequests.id });

  if (!request) return { error: "This request is no longer pending." };
  return { success: true };
}
