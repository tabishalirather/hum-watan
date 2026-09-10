import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getChatRequestForParticipant, getMessages } from "@/features/messages/queries/get-messages";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chatRequestId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatRequestId } = await params;

  try {
    const chatRequest = await getChatRequestForParticipant(chatRequestId, session.user.id);
    if (!chatRequest || chatRequest.status !== "accepted") {
      return NextResponse.json({ error: "This conversation is not available." }, { status: 404 });
    }

    const messages = await getMessages(chatRequestId);
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Failed to load messages:", error);
    return NextResponse.json({ error: "Failed to load messages." }, { status: 500 });
  }
}
