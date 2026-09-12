import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getNotifications } from "@/features/notifications/queries/get-notifications";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const notifications = await getNotifications(session.user.id);
    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Failed to load notifications:", error);
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }
}
