import { NextRequest, NextResponse } from "next/server";
import { getMapPeople, type MapFilters } from "@/features/map/queries/get-map-people";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

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
