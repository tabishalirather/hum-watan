import { db } from "@/db/client";
import { countries, cities, universities } from "@/db/schema";

export async function getFilterOptions() {
  const [countryRows, cityRows, universityRows] = await Promise.all([
    db.select().from(countries),
    db.select().from(cities),
    db.select().from(universities),
  ]);

  return { countries: countryRows, cities: cityRows, universities: universityRows };
}
