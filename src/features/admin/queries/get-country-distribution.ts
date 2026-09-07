import { and, count, desc, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles, users, universities, cities, countries } from "@/db/schema";
import type { MapFilters } from "@/features/map/queries/get-map-people";

export async function getCountryDistribution(filters: MapFilters = {}) {
  const conditions = [
    eq(profiles.role, "mentor"),
    eq(profiles.verified, true),
    eq(profiles.visibleOnMap, true),
    eq(users.isActive, true),
    filters.subject ? ilike(profiles.subject, `%${filters.subject}%`) : undefined,
    filters.degreeLevels && filters.degreeLevels.length > 0
      ? inArray(profiles.degreeLevel, filters.degreeLevels)
      : undefined,
    filters.cityIds && filters.cityIds.length > 0 ? inArray(cities.id, filters.cityIds) : undefined,
    filters.countryIds && filters.countryIds.length > 0
      ? inArray(countries.id, filters.countryIds)
      : undefined,
    filters.universityIds && filters.universityIds.length > 0
      ? inArray(profiles.universityId, filters.universityIds)
      : undefined,
  ].filter(Boolean);

  const rows = await db
    .select({
      countryId: countries.id,
      countryName: countries.name,
      count: count(),
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .innerJoin(universities, eq(universities.id, profiles.universityId))
    .innerJoin(cities, eq(cities.id, universities.cityId))
    .innerJoin(countries, eq(countries.id, cities.countryId))
    .where(and(...conditions))
    .groupBy(countries.id, countries.name)
    .orderBy(desc(count()));

  return rows;
}

export type CountryDistribution = Awaited<ReturnType<typeof getCountryDistribution>>;
