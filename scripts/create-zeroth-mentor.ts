import "dotenv/config";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { users } from "../src/db/schema/auth";
import { profiles } from "../src/db/schema/profiles";
import { countries, cities, universities } from "../src/db/schema/geo";
import { generateUniqueUsername } from "../src/features/auth/lib/username";

async function main() {
  const email = "tabishrather7006@gmail.com";
  const password = "password123";

const [country] = await db
  .insert(countries)
  .values({ name: "France", code: "FR" })
  .onConflictDoNothing({ target: countries.code })
  .returning();
const france = country ?? (await db.query.countries.findFirst({ where: eq(countries.code, "FR") }));
if (!france) throw new Error("Could not create or find France.");

const [city] = await db
  .insert(cities)
  .values({ name: "Nice", countryId: france.id, lat: 43.7102, lng: 7.262 })
  .onConflictDoNothing()
  .returning();
const nice = city ?? (await db.select().from(cities).where(and(eq(cities.name, "Nice"), eq(cities.countryId, france.id))).limit(1))[0];
if (!nice) throw new Error("Could not create or find Nice.");

const [university] = await db
  .insert(universities)
  .values({ name: "University Cote d Azur", cityId: nice.id, lat: 43.615, lng: 7.071 })
  .onConflictDoNothing()
  .returning();
const primaryUniversity = university ?? (await db.select().from(universities).where(and(eq(universities.name, "University Cote d Azur"), eq(universities.cityId, nice.id))).limit(1))[0];
if (!primaryUniversity) throw new Error("Could not create or find university.");

const passwordHash = await bcrypt.hash(password, 10);
let user = await db.query.users.findFirst({ where: eq(users.email, email) });
if (user) {
  [user] = await db.update(users).set({ name: "Tabish Ali Rather", passwordHash }).where(eq(users.id, user.id)).returning();
} else {
  const username = await generateUniqueUsername("mentor");
  [user] = await db.insert(users).values({ name: "Tabish Ali Rather", email, passwordHash, username }).returning();
}

const bio = "Primary affiliation: University Cote d Azur, Nice, France. Previous affiliations: University of L Aquila, Italy; TUHH/UHH, Hamburg, Germany. InterMaths background.";
await db
  .insert(profiles)
  .values({
    userId: user.id,
    role: "mentor",
    verified: true,
    universityId: primaryUniversity.id,
    subject: "Mathematics",
    degreeLevel: "masters",
    coordinatorLevel: "country",
    scholarshipStatus: "Erasmus Mundus Joint Master",
    bio,
  })
  .onConflictDoUpdate({
    target: profiles.userId,
    set: {
      role: "mentor",
      verified: true,
      universityId: primaryUniversity.id,
      subject: "Mathematics",
      degreeLevel: "masters",
      coordinatorLevel: "country",
      scholarshipStatus: "Erasmus Mundus Joint Master",
      bio,
    },
  });

  console.log(JSON.stringify({ email, password, name: user.name, role: "mentor", verified: true, coordinatorLevel: "country", university: "University Cote d Azur", city: "Nice", country: "France" }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
