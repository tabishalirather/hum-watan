import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { getChatRequestForParticipant, getMessages } from "@/features/messages/queries/get-messages";
import { MessageThread } from "@/features/messages/components/message-thread";

export default async function ChatThreadPage({
	params,
}: {
	params: Promise<{ chatRequestId: string }>;
}) {
	const session = await auth();
	if (!session?.user?.id) redirect("/login");

	const { chatRequestId } = await params;

	const chatRequest = await getChatRequestForParticipant(chatRequestId, session.user.id);
	if (!chatRequest || chatRequest.status !== "accepted") redirect("/connections");

	const otherUserId =
		chatRequest.requesterUserId === session.user.id
			? chatRequest.recipientUserId
			: chatRequest.requesterUserId;
	const otherUser = await db.query.users.findFirst({ where: eq(users.id, otherUserId) });

	const initialMessages = await getMessages(chatRequestId);

	return (
		<main className="mx-auto w-full max-w-2xl px-4 py-10">
			<Link
				href="/connections"
				className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="size-3.5" />
				Back to connections
			</Link>
			<MessageThread
				chatRequestId={chatRequestId}
				currentUserId={session.user.id}
				otherPartyName={otherUser?.name ?? "Unnamed user"}
				initialMessages={initialMessages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
			/>
		</main>
	);
}
