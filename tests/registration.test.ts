import { describe, it, expect } from 'vitest';
import { registerMentee } from '@/features/auth/actions/register-mentee';
import { registerMentor } from '@/features/auth/actions/register-mentor';
import { db } from '@/db/client';
import { users, profiles, mentorReferrals } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createTestProfile, createTestUser } from './fixtures';

describe('Registration', () => {
  describe('registerMentee', () => {
    it('should successfully register a new mentee', async () => {
      const result = await registerMentee({
        name: 'Alice Mentee',
        email: 'alice@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);

      const user = await db.query.users.findFirst({
        where: eq(users.email, 'alice@example.com'),
      });

      expect(user).toBeDefined();
      expect(user?.name).toBe('Alice Mentee');

      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, user!.id),
      });

      expect(profile).toBeDefined();
      expect(profile?.role).toBe('mentee');
      expect(profile?.verified).toBe(true);
    });

    it('should reject duplicate email', async () => {
      // Create first user
      await registerMentee({
        name: 'Alice',
        email: 'duplicate@example.com',
        password: 'password123',
      });

      // Try to register with same email
      const result = await registerMentee({
        name: 'Bob',
        email: 'duplicate@example.com',
        password: 'password456',
      });

      expect('error' in result).toBe(true);
      expect(result.error).toContain('already exists');
    });

    it('should reject short password', async () => {
      const result = await registerMentee({
        name: 'Charlie',
        email: 'charlie@example.com',
        password: 'short', // Less than 8 characters
      });

      expect('error' in result).toBe(true);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid email', async () => {
      const result = await registerMentee({
        name: 'Dave',
        email: 'not-an-email',
        password: 'password123',
      });

      expect('error' in result).toBe(true);
      expect(result.error).toBeDefined();
    });
  });

  describe('registerMentor', () => {
    it('should successfully register a mentor with valid referee', async () => {
      // Create a referee mentor first
      const refereeName = 'Eve Mentor';
      const refereeEmail = 'eve@example.com';
      const { userId: refereeUserId } = await createTestUser({
        email: refereeEmail,
        name: refereeName,
      });

      await createTestProfile({
        userId: refereeUserId,
        role: 'mentor',
        verified: true,
      });

      // Register new mentor with the referee
      const result = await registerMentor({
        name: 'Frank Mentor',
        email: 'frank@example.com',
        password: 'password123',
        refereeEmail,
      });

      expect(result.success).toBe(true);

      const mentorUser = await db.query.users.findFirst({
        where: eq(users.email, 'frank@example.com'),
      });

      expect(mentorUser).toBeDefined();

      const mentorProfile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, mentorUser!.id),
      });

      expect(mentorProfile?.role).toBe('mentor');
      expect(mentorProfile?.verified).toBe(false); // Not yet verified

      const referral = await db.query.mentorReferrals.findFirst({
        where: eq(mentorReferrals.mentorUserId, mentorUser!.id),
      });

      expect(referral).toBeDefined();
      expect(referral?.status).toBe('pending');
      expect(referral?.refereeEmail).toBe(refereeEmail);
    });

    it('should reject mentor registration when referee is not a mentor', async () => {
      // Create a non-mentor (mentee)
      const { userId: menteeUserId } = await createTestUser({
        email: 'notmentor@example.com',
      });

      await createTestProfile({
        userId: menteeUserId,
        role: 'mentee',
      });

      const result = await registerMentor({
        name: 'Grace Mentor',
        email: 'grace@example.com',
        password: 'password123',
        refereeEmail: 'notmentor@example.com',
      });

      expect('error' in result).toBe(true);
      expect(result.error).toContain('registered mentor');
    });

    it('should reject mentor registration when referee email does not exist', async () => {
      const result = await registerMentor({
        name: 'Henry Mentor',
        email: 'henry@example.com',
        password: 'password123',
        refereeEmail: 'nonexistent@example.com',
      });

      expect('error' in result).toBe(true);
      expect(result.error).toContain('registered mentor');
    });

    it('should handle duplicate mentor email', async () => {
      // Create referee
      const { userId: refereeUserId } = await createTestUser({
        email: 'referee2@example.com',
      });

      await createTestProfile({
        userId: refereeUserId,
        role: 'mentor',
        verified: true,
      });

      // Register first mentor
      await registerMentor({
        name: 'Ivan Mentor',
        email: 'ivan@example.com',
        password: 'password123',
        refereeEmail: 'referee2@example.com',
      });

      // Try to register with same email
      const result = await registerMentor({
        name: 'Ivan 2',
        email: 'ivan@example.com',
        password: 'password456',
        refereeEmail: 'referee2@example.com',
      });

      expect('error' in result).toBe(true);
      expect(result.error).toContain('already exists');
    });
  });
});
