import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { cities, countries, universities } from "@/db/schema";

export async function getProfileOptions() {
  return db
    .select({
      id: universities.id,
      name: universities.name,
      cityName: cities.name,
      countryName: countries.name,
    })
    .from(universities)
    .innerJoin(cities, eq(cities.id, universities.cityId))
    .innerJoin(countries, eq(countries.id, cities.countryId))
    .orderBy(asc(countries.name), asc(cities.name), asc(universities.name));
}
