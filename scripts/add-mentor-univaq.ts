import "dotenv/config";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { users } from "../src/db/schema/auth";
import { profiles } from "../src/db/schema/profiles";
import { countries, cities, universities } from "../src/db/schema/geo";

async function main() {
  const email = "tabishali.rather1@student.univaq.it";
  const password = "password123";
  const name = "Tabish Ali Rather";

  const [country] = await db
    .insert(countries)
    .values({ name: "Italy", code: "IT" })
    .onConflictDoNothing({ target: countries.code })
    .returning();
  const italy = country ?? (await db.query.countries.findFirst({ where: eq(countries.code, "IT") }));
  if (!italy) throw new Error("Could not create or find Italy.");

  const [city] = await db
    .insert(cities)
    .values({ name: "L'Aquila", countryId: italy.id, lat: 42.3498, lng: 13.3995 })
    .onConflictDoNothing()
    .returning();
  const laquila = city ?? (await db.select().from(cities).where(and(eq(cities.name, "L'Aquila"), eq(cities.countryId, italy.id))).limit(1))[0];
  if (!laquila) throw new Error("Could not create or find L'Aquila.");

  const [university] = await db
    .insert(universities)
    .values({ name: "University of L'Aquila", cityId: laquila.id, lat: 42.3706, lng: 13.3888 })
    .onConflictDoNothing()
    .returning();
  const univaq = university ?? (await db.select().from(universities).where(and(eq(universities.name, "University of L'Aquila"), eq(universities.cityId, laquila.id))).limit(1))[0];
  if (!univaq) throw new Error("Could not create or find university.");

  const passwordHash = await bcrypt.hash(password, 10);
  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (user) {
    [user] = await db.update(users).set({ name, passwordHash }).where(eq(users.id, user.id)).returning();
  } else {
    [user] = await db.insert(users).values({ name, email, passwordHash }).returning();
  }

  await db
    .insert(profiles)
    .values({
      userId: user.id,
      role: "mentor",
      verified: true,
      universityId: univaq.id,
      degreeLevel: "masters",
      coordinatorLevel: "none",
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        role: "mentor",
        verified: true,
        universityId: univaq.id,
        degreeLevel: "masters",
        coordinatorLevel: "none",
      },
    });

  console.log(JSON.stringify({ email, password, name: user.name, role: "mentor", verified: true, university: "University of L'Aquila", city: "L'Aquila", country: "Italy" }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
