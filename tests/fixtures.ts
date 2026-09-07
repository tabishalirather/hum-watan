import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '@/db/client';
import {
  countries,
  cities,
  universities,
  users,
  profiles,
  mentorReferrals,
} from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function createTestCountry(name: string = 'Test Country', code: string = 'TC') {
  const result = await db
    .insert(countries)
    .values({ name, code })
    .returning();
  return result[0];
}

export async function createTestCity(
  countryId: string,
  name: string = 'Test City',
  lat: number = 0,
  lng: number = 0
) {
  const result = await db
    .insert(cities)
    .values({ countryId, name, lat, lng })
    .returning();
  return result[0];
}

export async function createTestUniversity(
  cityId: string,
  name: string = 'Test University',
  lat: number = 0,
  lng: number = 0
) {
  const result = await db
    .insert(universities)
    .values({ cityId, name, lat, lng })
    .returning();
  return result[0];
}

export async function createTestUser(options: {
  email?: string;
  name?: string;
  password?: string;
  isActive?: boolean;
} = {}) {
  const {
    email = `test-${randomUUID()}@example.com`,
    name = 'Test User',
    password = 'password123',
    isActive = true,
  } = options;

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await db
    .insert(users)
    .values({ email, name, passwordHash, isActive })
    .returning();

  return {
    userId: result[0].id,
    email: result[0].email,
    name: result[0].name,
  };
}

export async function createTestProfile(options: {
  userId: string;
  role?: 'mentee' | 'mentor' | 'admin';
  verified?: boolean;
  visibleOnMap?: boolean;
  subject?: string | null;
  degreeLevel?: string | null;
  universityId?: string | null;
  coordinatorLevel?: 'none' | 'city' | 'country';
}) {
  const {
    userId,
    role = 'mentee',
    verified = false,
    visibleOnMap = true,
    subject = null,
    degreeLevel = null as any,
    universityId = null,
    coordinatorLevel = 'none',
  } = options;

  const result = await db
    .insert(profiles)
    .values({
      userId,
      role,
      verified,
      visibleOnMap,
      subject,
      degreeLevel,
      universityId,
      coordinatorLevel,
    } as any)
    .returning();

  return result[0];
}

export async function createTestMentorReferral(options: {
  mentorUserId: string;
  refereeUserId?: string;
  refereeEmail?: string;
  status?: 'pending' | 'confirmed' | 'rejected';
  token?: string;
}) {
  const {
    mentorUserId,
    refereeEmail = 'referee@example.com',
    status = 'pending',
    token = randomUUID(),
  } = options;

  const result = await db
    .insert(mentorReferrals)
    .values({
      mentorUserId,
      refereeEmail,
      status,
      token,
    } as any)
    .returning();

  return result[0];
}

export async function getUserById(userId: string) {
  return await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}

export async function getProfileByUserId(userId: string) {
  return await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
}

export async function getMentorReferralById(referralId: string) {
  return await db.query.mentorReferrals.findFirst({
    where: eq(mentorReferrals.id, referralId),
  });
}
