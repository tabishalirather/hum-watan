import { NextResponse } from "next/server";
import { getFilterOptions } from "@/features/map/queries/get-filter-options";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(`map-filter-options:${getClientIp(request)}`, 30, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many filter-option requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
    );
  }

  try {
    const options = await getFilterOptions();
    return NextResponse.json(options);
  } catch (error) {
    console.error("Failed to load map filter options:", error);
    return NextResponse.json({ error: "Failed to load filter options." }, { status: 500 });
  }
}
