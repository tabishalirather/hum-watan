import { NextRequest, NextResponse } from "next/server";
import { getMapPeople, type MapFilters } from "@/features/map/queries/get-map-people";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const filters: MapFilters = {
    subject: params.get("subject") ?? undefined,
    degreeLevel: (params.get("degreeLevel") as MapFilters["degreeLevel"]) ?? undefined,
    cityId: params.get("cityId") ?? undefined,
    countryId: params.get("countryId") ?? undefined,
    universityId: params.get("universityId") ?? undefined,
  };

  const people = await getMapPeople(filters);
  return NextResponse.json(people);
}
