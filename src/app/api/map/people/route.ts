import { NextRequest, NextResponse } from "next/server";
import { getMapPeople, type MapFilters } from "@/features/map/queries/get-map-people";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(`map-people:${getClientIp(request)}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many map requests. Please try again shortly." },
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

  const people = await getMapPeople(filters);
  return NextResponse.json(people);
}
