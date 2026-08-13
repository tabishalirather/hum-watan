import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./client";
import { countries, cities, universities, users, profiles } from "./schema";

async function main() {
  const [uk, cz] = await db
    .insert(countries)
    .values([
      { name: "United Kingdom", code: "GB" },
      { name: "Czech Republic", code: "CZ" },
    ])
    .returning();

  const [london, prague] = await db
    .insert(cities)
    .values([
      { name: "London", countryId: uk.id, lat: 51.5072, lng: -0.1276 },
      { name: "Prague", countryId: cz.id, lat: 50.0755, lng: 14.4378 },
    ])
    .returning();

  const [ucl, charles] = await db
    .insert(universities)
    .values([
      { name: "University College London", cityId: london.id, lat: 51.5246, lng: -0.1339 },
      { name: "Charles University", cityId: prague.id, lat: 50.0871, lng: 14.4212 },
    ])
    .returning();

  const passwordHash = await bcrypt.hash("password123", 10);

  const [mentor] = await db
    .insert(users)
    .values({ name: "Demo Mentor", email: "mentor@example.com", passwordHash })
    .returning();

  await db.insert(profiles).values({
    userId: mentor.id,
    role: "mentor",
    subject: "Mathematics",
    degreeLevel: "phd",
    universityId: ucl.id,
    coordinatorLevel: "country",
    verified: true,
  });

  const [mentee] = await db
    .insert(users)
    .values({ name: "Demo Mentee", email: "mentee@example.com", passwordHash })
    .returning();

  await db.insert(profiles).values({
    userId: mentee.id,
    role: "mentee",
    subject: "Mathematics",
    degreeLevel: "masters",
    universityId: charles.id,
    verified: true,
  });

  console.log("Seeded demo data.");
  console.log("Mentor login: mentor@example.com / password123 (already a confirmed mentor)");
  console.log("Mentee login: mentee@example.com / password123");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
