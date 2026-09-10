import { and, eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { profiles } from "@/db/schema/profiles";
import { universities, cities, countries } from "@/db/schema/geo";
import { chatRequests } from "@/db/schema/chat-requests";

async function findConnection(viewerId: string, targetId: string) {
  return db.query.chatRequests.findFirst({
    where: and(
      eq(chatRequests.status, "accepted"),
      or(
        and(eq(chatRequests.requesterUserId, viewerId), eq(chatRequests.recipientUserId, targetId)),
        and(eq(chatRequests.requesterUserId, targetId), eq(chatRequests.recipientUserId, viewerId)),
      ),
    ),
  });
}

// A mentor's profile is visible to anyone signed in, same as the map (they
// opted into being a public directory entry). A mentee's profile is only
// visible to people they're actually connected with - mentees never appear
// in any public directory, so a page for one shouldn't either. The owner
// can always view their own profile, regardless of these rules.
export async function getPublicProfile(targetUserId: string, viewerId: string) {
  const target = await db.query.profiles.findFirst({ where: eq(profiles.userId, targetUserId) });
  if (!target) return null;

  const user = await db.query.users.findFirst({ where: eq(users.id, targetUserId) });
  if (!user || !user.isActive) return null;

  const isSelf = targetUserId === viewerId;

  if (target.role === "admin" && !isSelf) return null;

  const connection = isSelf ? undefined : await findConnection(viewerId, targetUserId);

  if (target.role === "mentee" && !isSelf && !connection) return null;

  if (target.role === "mentor" && !isSelf) {
    const publiclyListed = target.verified && target.visibleOnMap;
    if (!publiclyListed && !connection) return null;
  }

  let universityName: string | null = null;
  let cityName: string | null = null;
  if (target.universityId) {
    const location = await db
      .select({ universityName: universities.name, cityName: cities.name })
      .from(universities)
      .innerJoin(cities, eq(cities.id, universities.cityId))
      .innerJoin(countries, eq(countries.id, cities.countryId))
      .where(eq(universities.id, target.universityId))
      .then((rows) => rows[0]);
    universityName = location?.universityName ?? null;
    cityName = location?.cityName ?? null;
  }

  const showEverything = isSelf;

  return {
    userId: targetUserId,
    name: user.name,
    role: target.role,
    verified: target.verified,
    isSelf,
    subject: target.subject,
    degreeLevel: target.degreeLevel,
    university: showEverything || target.showUniversity ? universityName : null,
    city: showEverything || target.showCity ? cityName : null,
    bio: showEverything || target.showBio ? target.bio : null,
    targetPrograms: target.targetPrograms,
    background: target.background,
    helpNeeded: target.helpNeeded,
    privacy: { showUniversity: target.showUniversity, showCity: target.showCity, showBio: target.showBio },
    chatRequestId: connection?.id ?? null,
  };
}

export type PublicProfile = NonNullable<Awaited<ReturnType<typeof getPublicProfile>>>;
