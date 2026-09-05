import "dotenv/config";
import bcrypt from "bcryptjs";
import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "./client";
import { countries, cities, universities, users, profiles } from "./schema";

const LOCATIONS = [
  ["United Kingdom", "GB", "London", 51.5072, -0.1276, "University College London"],
  ["Czech Republic", "CZ", "Prague", 50.0755, 14.4378, "Charles University"],
  ["United States", "US", "New York", 40.7128, -74.006, "Columbia University"],
  ["Canada", "CA", "Toronto", 43.6532, -79.3832, "University of Toronto"],
  ["Kashmir", "KSH", "Srinagar", 34.0837, 74.7973, "University of Kashmir"],
  ["United Arab Emirates", "AE", "Dubai", 25.2048, 55.2708, "University of Dubai"],
  ["Saudi Arabia", "SA", "Riyadh", 24.7136, 46.6753, "King Saud University"],
  ["Turkey", "TR", "Istanbul", 41.0082, 28.9784, "Istanbul University"],
  ["Malaysia", "MY", "Kuala Lumpur", 3.139, 101.6869, "University of Malaya"],
  ["Australia", "AU", "Melbourne", -37.8136, 144.9631, "University of Melbourne"],
  ["Germany", "DE", "Berlin", 52.52, 13.405, "Humboldt University of Berlin"],
  ["France", "FR", "Paris", 48.8566, 2.3522, "Paris Sciences et Lettres University"],
  ["Sweden", "SE", "Stockholm", 59.3293, 18.0686, "KTH Royal Institute of Technology"],
  ["Norway", "NO", "Oslo", 59.9139, 10.7522, "University of Oslo"],
  ["Netherlands", "NL", "Amsterdam", 52.3676, 4.9041, "University of Amsterdam"],
  ["Japan", "JP", "Tokyo", 35.6762, 139.6503, "University of Tokyo"],
  ["Singapore", "SG", "Singapore", 1.3521, 103.8198, "National University of Singapore"],
  ["South Africa", "ZA", "Cape Town", -33.9249, 18.4241, "University of Cape Town"],
  ["Nigeria", "NG", "Lagos", 6.5244, 3.3792, "University of Lagos"],
  ["Brazil", "BR", "Sao Paulo", -23.5505, -46.6333, "University of Sao Paulo"],
  ["Italy", "IT", "Rome", 41.9028, 12.4964, "Sapienza University of Rome"],
  ["Spain", "ES", "Madrid", 40.4168, -3.7038, "Complutense University of Madrid"],
  ["Portugal", "PT", "Lisbon", 38.7223, -9.1393, "University of Lisbon"],
  ["Ireland", "IE", "Dublin", 53.3498, -6.2603, "Trinity College Dublin"],
  ["Belgium", "BE", "Brussels", 50.8503, 4.3517, "Vrije Universiteit Brussel"],
  ["Switzerland", "CH", "Zurich", 47.3769, 8.5417, "University of Zurich"],
  ["Austria", "AT", "Vienna", 48.2082, 16.3738, "University of Vienna"],
  ["Denmark", "DK", "Copenhagen", 55.6761, 12.5683, "University of Copenhagen"],
  ["Finland", "FI", "Helsinki", 60.1699, 24.9384, "University of Helsinki"],
  ["Poland", "PL", "Warsaw", 52.2297, 21.0122, "University of Warsaw"],
  ["Greece", "GR", "Athens", 37.9838, 23.7275, "National and Kapodistrian University of Athens"],
  ["Egypt", "EG", "Cairo", 30.0444, 31.2357, "Cairo University"],
  ["Morocco", "MA", "Rabat", 34.0209, -6.8416, "Mohammed V University"],
  ["Tunisia", "TN", "Tunis", 36.8065, 10.1815, "University of Tunis"],
  ["Ghana", "GH", "Accra", 5.6037, -0.187, "University of Ghana"],
  ["Kenya", "KE", "Nairobi", -1.2921, 36.8219, "University of Nairobi"],
  ["Tanzania", "TZ", "Dar es Salaam", -6.7924, 39.2083, "University of Dar es Salaam"],
  ["Rwanda", "RW", "Kigali", -1.9441, 30.0619, "University of Rwanda"],
  ["Ethiopia", "ET", "Addis Ababa", 9.03, 38.74, "Addis Ababa University"],
  ["China", "CN", "Beijing", 39.9042, 116.4074, "Peking University"],
  ["South Korea", "KR", "Seoul", 37.5665, 126.978, "Seoul National University"],
  ["Thailand", "TH", "Bangkok", 13.7563, 100.5018, "Chulalongkorn University"],
  ["Indonesia", "ID", "Jakarta", -6.2088, 106.8456, "University of Indonesia"],
  ["Vietnam", "VN", "Ho Chi Minh City", 10.8231, 106.6297, "Vietnam National University"],
  ["Philippines", "PH", "Manila", 14.5995, 120.9842, "University of the Philippines"],
  ["New Zealand", "NZ", "Auckland", -36.8509, 174.7645, "University of Auckland"],
  ["Mexico", "MX", "Mexico City", 19.4326, -99.1332, "National Autonomous University of Mexico"],
  ["Chile", "CL", "Santiago", -33.4489, -70.6693, "University of Chile"],
  ["Argentina", "AR", "Buenos Aires", -34.6037, -58.3816, "University of Buenos Aires"],
  ["Colombia", "CO", "Bogota", 4.711, -74.0721, "National University of Colombia"],
] as const;

const SUBJECTS = [
  "Computer Science",
  "Medicine",
  "Engineering",
  "Economics",
  "Law",
  "Architecture",
  "Environmental Science",
  "Mathematics",
];

const FIRST_NAMES = ["Aaliya", "Areesha", "Daniyal", "Emaan", "Farhan", "Hiba", "Ibrahim", "Mariam"];
const LAST_NAMES = ["Dar", "Lone", "Mir", "Shah", "Wani", "Zargar", "Bhat", "Khan"];

async function getOrCreateCountry(name: string, code: string) {
  const existing = await db.query.countries.findFirst({ where: eq(countries.code, code) });
  if (existing) return existing;
  const [country] = await db.insert(countries).values({ name, code }).returning();
  return country;
}

async function getOrCreateCity(name: string, countryId: string, lat: number, lng: number) {
  const existing = await db.query.cities.findFirst({
    where: and(eq(cities.name, name), eq(cities.countryId, countryId)),
  });
  if (existing) return existing;
  const [city] = await db.insert(cities).values({ name, countryId, lat, lng }).returning();
  return city;
}

async function getOrCreateUniversity(name: string, cityId: string, lat: number, lng: number) {
  const existing = await db.query.universities.findFirst({
    where: and(eq(universities.name, name), eq(universities.cityId, cityId)),
  });
  if (existing) return existing;
  const [university] = await db.insert(universities).values({ name, cityId, lat, lng }).returning();
  return university;
}

async function getOrCreateUser(name: string, email: string, passwordHash: string) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return existing;
  const [user] = await db.insert(users).values({ name, email, passwordHash }).returning();
  return user;
}

async function removeLegacyDemoData() {
  await db.delete(users).where(like(users.email, "demo.mentor.%@example.com"));

  for (const countryCode of ["IN", "PK"]) {
    const country = await db.query.countries.findFirst({ where: eq(countries.code, countryCode) });
    if (!country) continue;

    const countryCities = await db
      .select({ id: cities.id })
      .from(cities)
      .where(eq(cities.countryId, country.id));
    const cityIds = countryCities.map((city) => city.id);

    if (cityIds.length > 0) {
      await db.delete(universities).where(inArray(universities.cityId, cityIds));
      await db.delete(cities).where(inArray(cities.id, cityIds));
    }
    await db.delete(countries).where(eq(countries.id, country.id));
  }
}

async function main() {
  await removeLegacyDemoData();
  const passwordHash = await bcrypt.hash("password123", 10);
  const universityRecords = new Map<string, { id: string }>();

  for (const [countryName, countryCode, cityName, lat, lng, universityName] of LOCATIONS) {
    const country = await getOrCreateCountry(countryName, countryCode);
    const city = await getOrCreateCity(cityName, country.id, lat, lng);
    const university = await getOrCreateUniversity(universityName, city.id, lat, lng);
    universityRecords.set(countryCode, university);
  }

  const londonUniversity = universityRecords.get("GB");
  const pragueUniversity = universityRecords.get("CZ");
  if (!londonUniversity || !pragueUniversity) throw new Error("Demo universities were not created.");

  const mentor = await getOrCreateUser("Demo Mentor", "mentor@example.com", passwordHash);
  await db
    .insert(profiles)
    .values({
      userId: mentor.id,
      role: "mentor",
      subject: "Mathematics",
      degreeLevel: "phd",
      universityId: londonUniversity.id,
      coordinatorLevel: "country",
      verified: true,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { role: "mentor", subject: "Mathematics", degreeLevel: "phd", universityId: londonUniversity.id, coordinatorLevel: "country", verified: true },
    });

  const mentee = await getOrCreateUser("Demo Mentee", "mentee@example.com", passwordHash);
  await db
    .insert(profiles)
    .values({
      userId: mentee.id,
      role: "mentee",
      subject: "Mathematics",
      degreeLevel: "masters",
      universityId: pragueUniversity.id,
      verified: true,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { role: "mentee", subject: "Mathematics", degreeLevel: "masters", universityId: pragueUniversity.id, verified: true },
    });

  let seededMentors = 0;
  for (let index = 0; index < 150; index += 1) {
    const location = LOCATIONS[index % LOCATIONS.length];
    const university = universityRecords.get(location[1]);
    if (!university) throw new Error(`Missing university for ${location[1]}.`);

    const name = `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[index % LAST_NAMES.length]} ${String(index + 1).padStart(3, "0")}`;
    const email = `demo.mentor.${String(index + 1).padStart(3, "0")}@example.com`;
    const user = await getOrCreateUser(name, email, passwordHash);

    await db
      .insert(profiles)
      .values({
        userId: user.id,
        role: "mentor",
        subject: SUBJECTS[index % SUBJECTS.length],
        degreeLevel: index % 3 === 0 ? "phd" : index % 3 === 1 ? "masters" : "bachelors",
        universityId: university.id,
        coordinatorLevel: index % 10 === 0 ? "country" : "none",
        verified: true,
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          role: "mentor",
          subject: SUBJECTS[index % SUBJECTS.length],
          degreeLevel: index % 3 === 0 ? "phd" : index % 3 === 1 ? "masters" : "bachelors",
          universityId: university.id,
          coordinatorLevel: index % 10 === 0 ? "country" : "none",
          verified: true,
        },
      });
    seededMentors += 1;
  }

  console.log(`Seeded demo data with ${seededMentors} world-wide mentors.`);
  console.log("Mentor login: mentor@example.com / password123 (already a confirmed mentor)");
  console.log("Mentee login: mentee@example.com / password123");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
