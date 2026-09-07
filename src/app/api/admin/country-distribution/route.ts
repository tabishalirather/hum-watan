import { NextRequest, NextResponse } from "next/server";
import { getCountryDistribution } from "@/features/admin/queries/get-country-distribution";
import { getAdminUserId } from "@/features/admin/lib/require-admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { MapFilters } from "@/features/map/queries/get-map-people";

export async function GET(request: NextRequest) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimit = checkRateLimit(`admin-country-dist:${getClientIp(request)}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
    );
  }

  const params = request.nextUrl.searchParams;
  const filterValues = ["degreeLevel", "cityId", "countryId", "universityId"].flatMap((key) =>
    params.getAll(key),
  );
  if (filterValues.length > 100 || (params.get("subject")?.length ?? 0) > 100) {
    return NextResponse.json({ error: "Filter request is too large." }, { status: 400 });
  }

  const filters: MapFilters = {
    subject: params.get("subject") ?? undefined,
    degreeLevels: params.getAll("degreeLevel") as MapFilters["degreeLevels"],
    cityIds: params.getAll("cityId"),
    countryIds: params.getAll("countryId"),
    universityIds: params.getAll("universityId"),
  };

  const distribution = await getCountryDistribution(filters);
  return NextResponse.json(distribution);
}
