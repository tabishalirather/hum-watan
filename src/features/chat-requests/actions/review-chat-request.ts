"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { chatRequests } from "@/db/schema/chat-requests";
import { auditEvents } from "@/db/schema/audit";

export async function reviewChatRequest(requestId: string, decision: "accepted" | "rejected") {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in to review requests." };

  const [request] = await db
    .update(chatRequests)
    .set({ status: decision, reviewedAt: new Date() })
    .where(
      and(
        eq(chatRequests.id, requestId),
        eq(chatRequests.recipientUserId, session.user.id),
        eq(chatRequests.status, "pending"),
      ),
    )
    .returning({ id: chatRequests.id });

  if (!request) return { error: "This request is no longer pending." };

  await db.insert(auditEvents).values({
    actorUserId: session.user.id,
    action: decision === "accepted" ? "chat_request_accepted" : "chat_request_rejected",
    entityType: "chat_request",
    entityId: requestId,
  });

  return { success: true };
}
