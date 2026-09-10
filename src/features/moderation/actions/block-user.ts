"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { auditEvents } from "@/db/schema/audit";
import { userBlocks } from "@/db/schema/moderation";
import { users } from "@/db/schema/auth";

const userIdSchema = z.string().uuid();

export async function blockUser(blockedUserId: string) {
	const session = await auth();
	if (!session?.user?.id) return { error: "You must be signed in to block a user." };
	const parsed = userIdSchema.safeParse(blockedUserId);
	if (!parsed.success) return { error: "Invalid user." };
	if (blockedUserId === session.user.id) return { error: "You cannot block yourself." };

	const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, blockedUserId));
	if (!target) return { error: "This user is no longer available." };

	const result = await db.transaction(async (tx) => {
		const [block] = await tx
			.insert(userBlocks)
			.values({ blockerUserId: session.user.id, blockedUserId })
			.onConflictDoNothing()
			.returning({ id: userBlocks.id });
		if (!block) return { alreadyBlocked: true };

		await tx.insert(auditEvents).values({
			actorUserId: session.user.id,
			action: "user_blocked",
			entityType: "user",
			entityId: blockedUserId,
		});
		return { alreadyBlocked: false };
	});

	return { success: true, ...result };
}

export async function unblockUser(blockedUserId: string) {
	const session = await auth();
	if (!session?.user?.id) return { error: "You must be signed in to unblock a user." };
	const parsed = userIdSchema.safeParse(blockedUserId);
	if (!parsed.success) return { error: "Invalid user." };

	const [block] = await db
		.delete(userBlocks)
		.where(and(eq(userBlocks.blockerUserId, session.user.id), eq(userBlocks.blockedUserId, blockedUserId)))
		.returning({ id: userBlocks.id });
	if (!block) return { error: "This user is not blocked." };

	await db.insert(auditEvents).values({
		actorUserId: session.user.id,
		action: "user_unblocked",
		entityType: "user",
		entityId: blockedUserId,
	});
	return { success: true };
}