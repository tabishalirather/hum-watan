import { and, eq, ilike, inArray, notInArray, or } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles, users, universities, cities, countries, userBlocks } from "@/db/schema";

export type MapFilters = {
  subject?: string;
  degreeLevels?: ("bachelors" | "masters" | "phd" | "other")[];
  cityIds?: string[];
  countryIds?: string[];
  universityIds?: string[];
};

export async function getMapPeople(filters: MapFilters = {}, viewerUserId?: string) {
  const blockedUserIds = viewerUserId
    ? await db
        .select({ blockerUserId: userBlocks.blockerUserId, blockedUserId: userBlocks.blockedUserId })
        .from(userBlocks)
        .where(
          or(eq(userBlocks.blockerUserId, viewerUserId), eq(userBlocks.blockedUserId, viewerUserId)),
        )
        .then((rows) =>
          rows
            .map((row) => (row.blockerUserId === viewerUserId ? row.blockedUserId : row.blockerUserId))
            .filter((userId) => userId !== viewerUserId),
        )
    : [];
  const conditions = [
    // The map is a directory of mentors to find, not a roster of everyone.
    // Mentees browse it — they're never plotted on it themselves.
    eq(profiles.role, "mentor"),
    eq(profiles.verified, true),
    eq(profiles.visibleOnMap, true),
    eq(users.isActive, true),
    blockedUserIds.length > 0 ? notInArray(profiles.userId, blockedUserIds) : undefined,
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
      mentorUserId: profiles.userId,
      name: users.name,
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
    .where(and(...conditions))
    .limit(500);

  return rows;
}

export type MapPerson = Awaited<ReturnType<typeof getMapPeople>>[number];
