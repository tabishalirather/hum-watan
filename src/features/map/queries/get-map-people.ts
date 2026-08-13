import { and, eq, ilike } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles, users, universities, cities, countries } from "@/db/schema";

export type MapFilters = {
  subject?: string;
  degreeLevel?: "bachelors" | "masters" | "phd" | "other";
  cityId?: string;
  countryId?: string;
  universityId?: string;
};

export async function getMapPeople(filters: MapFilters = {}) {
  const conditions = [
    filters.subject ? ilike(profiles.subject, `%${filters.subject}%`) : undefined,
    filters.degreeLevel ? eq(profiles.degreeLevel, filters.degreeLevel) : undefined,
    filters.cityId ? eq(cities.id, filters.cityId) : undefined,
    filters.countryId ? eq(countries.id, filters.countryId) : undefined,
    filters.universityId ? eq(profiles.universityId, filters.universityId) : undefined,
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
