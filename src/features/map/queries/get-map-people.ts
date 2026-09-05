import { and, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles, users, universities, cities, countries } from "@/db/schema";

export type MapFilters = {
  subject?: string;
  degreeLevels?: ("bachelors" | "masters" | "phd" | "other")[];
  cityIds?: string[];
  countryIds?: string[];
  universityIds?: string[];
};

export async function getMapPeople(filters: MapFilters = {}) {
  const conditions = [
    eq(profiles.verified, true),
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
      userId: users.id,
      name: users.name,
      role: profiles.role,
      coordinatorLevel: profiles.coordinatorLevel,
      subject: profiles.subject,
      degreeLevel: profiles.degreeLevel,
      universityName: universities.name,
      cityName: cities.name,
      countryName: countries.name,
      lat: universities.lat,
      lng: universities.lng,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .innerJoin(universities, eq(universities.id, profiles.universityId))
    .innerJoin(cities, eq(cities.id, universities.cityId))
    .innerJoin(countries, eq(countries.id, cities.countryId))
    .where(and(...conditions));

  return rows;
}

export type MapPerson = Awaited<ReturnType<typeof getMapPeople>>[number];
