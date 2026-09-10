import { and, eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { userBlocks } from "@/db/schema/moderation";

export async function areUsersBlocked(firstUserId: string, secondUserId: string) {
	const [block] = await db
		.select({ id: userBlocks.id })
		.from(userBlocks)
		.where(
			or(
				and(eq(userBlocks.blockerUserId, firstUserId), eq(userBlocks.blockedUserId, secondUserId)),
				and(eq(userBlocks.blockerUserId, secondUserId), eq(userBlocks.blockedUserId, firstUserId)),
			),
		)
		.limit(1);

	return Boolean(block);
}

export async function hasBlockedUser(blockerUserId: string, blockedUserId: string) {
	const [block] = await db
		.select({ id: userBlocks.id })
		.from(userBlocks)
		.where(and(eq(userBlocks.blockerUserId, blockerUserId), eq(userBlocks.blockedUserId, blockedUserId)))
		.limit(1);

	return Boolean(block);
}