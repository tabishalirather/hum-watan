import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/auth";
import { profiles } from "@/db/schema/profiles";
import { chatRequests } from "@/db/schema/chat-requests";
import { universities, cities, countries } from "@/db/schema/geo";

// A mentee's accepted connections: the mentors who approved their request.
export async function getConnectionsForMentee(menteeUserId: string) {
  return db
    .select({
      requestId: chatRequests.id,
      mentorUserId: chatRequests.mentorUserId,
      mentorName: users.name,
      mentorEmail: users.email,
      subject: profiles.subject,
      degreeLevel: profiles.degreeLevel,
      universityName: universities.name,
      cityName: cities.name,
      countryName: countries.name,
      connectedAt: chatRequests.reviewedAt,
    })
    .from(chatRequests)
    .innerJoin(users, eq(users.id, chatRequests.mentorUserId))
    .innerJoin(profiles, eq(profiles.userId, chatRequests.mentorUserId))
    .leftJoin(universities, eq(universities.id, profiles.universityId))
    .leftJoin(cities, eq(cities.id, universities.cityId))
    .leftJoin(countries, eq(countries.id, cities.countryId))
    .where(and(eq(chatRequests.menteeUserId, menteeUserId), eq(chatRequests.status, "accepted")))
    .orderBy(desc(chatRequests.reviewedAt));
}

// A mentor's accepted connections: the mentees whose requests they approved.
export async function getConnectionsForMentor(mentorUserId: string) {
  return db
    .select({
      requestId: chatRequests.id,
      menteeUserId: chatRequests.menteeUserId,
      menteeName: users.name,
      menteeEmail: users.email,
      targetPrograms: profiles.targetPrograms,
      background: profiles.background,
      helpNeeded: profiles.helpNeeded,
      connectedAt: chatRequests.reviewedAt,
    })
    .from(chatRequests)
    .innerJoin(users, eq(users.id, chatRequests.menteeUserId))
    .innerJoin(profiles, eq(profiles.userId, chatRequests.menteeUserId))
    .where(and(eq(chatRequests.mentorUserId, mentorUserId), eq(chatRequests.status, "accepted")))
    .orderBy(desc(chatRequests.reviewedAt));
}
