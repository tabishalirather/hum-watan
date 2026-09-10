import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMyChatRequests } from "@/features/chat-requests/queries/get-my-chat-requests";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const requests = await getMyChatRequests(session.user.id);
    return NextResponse.json(requests);
  } catch (error) {
    console.error("Failed to load chat requests:", error);
    return NextResponse.json({ error: "Failed to load chat requests." }, { status: 500 });
  }
}
