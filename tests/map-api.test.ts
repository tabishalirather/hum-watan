import { describe, it, expect, beforeEach } from 'vitest';
import { getMapPeople } from '@/features/map/queries/get-map-people';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  createTestCountry,
  createTestCity,
  createTestUniversity,
  createTestUser,
  createTestProfile,
} from './fixtures';

describe('Map API', () => {
  let testCountry: any;
  let testCity: any;
  let testUniversity: any;
  let verifiedMentor: any;
  let unverifiedMentor: any;
  let hiddenMentor: any;
  let inactiveMentor: any;
  let mentee: any;

  beforeEach(async () => {
    // Create geography
    testCountry = await createTestCountry('Test Country');
    testCity = await createTestCity(testCountry.id, 'Test City');
    testUniversity = await createTestUniversity(testCity.id, 'Test University');

    // Create verified, visible, active mentor (should appear on map)
    const { userId: verifiedMentorId } = await createTestUser({
      email: 'verified@example.com',
      name: 'Verified Mentor',
    });
    verifiedMentor = await createTestProfile({
      userId: verifiedMentorId,
      role: 'mentor',
      verified: true,
      visibleOnMap: true,
      universityId: testUniversity.id,
      subject: 'Mathematics',
      degreeLevel: 'masters',
    });

    // Create unverified mentor (should NOT appear)
    const { userId: unverifiedMentorId } = await createTestUser({
      email: 'unverified@example.com',
      name: 'Unverified Mentor',
    });
    unverifiedMentor = await createTestProfile({
      userId: unverifiedMentorId,
      role: 'mentor',
      verified: false,
      visibleOnMap: true,
      universityId: testUniversity.id,
      subject: 'Mathematics',
    });

    // Create hidden mentor (should NOT appear)
    const { userId: hiddenMentorId } = await createTestUser({
      email: 'hidden@example.com',
      name: 'Hidden Mentor',
    });
    hiddenMentor = await createTestProfile({
      userId: hiddenMentorId,
      role: 'mentor',
      verified: true,
      visibleOnMap: false,
      universityId: testUniversity.id,
      subject: 'Physics',
    });

    // Create inactive mentor (should NOT appear)
    const { userId: inactiveMentorId, email: inactiveEmail } = await createTestUser({
      email: 'inactive@example.com',
      name: 'Inactive Mentor',
      isActive: false,
    });
    inactiveMentor = await createTestProfile({
      userId: inactiveMentorId,
      role: 'mentor',
      verified: true,
      visibleOnMap: true,
      universityId: testUniversity.id,
      subject: 'Chemistry',
    });

    // Create mentee (should NOT appear even if verified/visible)
    const { userId: menteeId } = await createTestUser({
      email: 'mentee@example.com',
      name: 'Mentee',
    });
    mentee = await createTestProfile({
      userId: menteeId,
      role: 'mentee',
      verified: true,
      visibleOnMap: true,
      universityId: testUniversity.id,
    });
  });

  describe('getMapPeople', () => {
    it('should only return verified, visible, active mentors', async () => {
      const people = await getMapPeople({});

      expect(people.length).toBeGreaterThanOrEqual(1);

      const personNames = people.map(p => p.name);
      expect(personNames).toContain('Verified Mentor');
      expect(personNames).not.toContain('Unverified Mentor');
      expect(personNames).not.toContain('Hidden Mentor');
      expect(personNames).not.toContain('Inactive Mentor');
      expect(personNames).not.toContain('Mentee');
    });

    it('should return safe response shape (no internal IDs)', async () => {
      const people = await getMapPeople({});

      const person = people[0];

      // Should have public fields
      expect(person).toHaveProperty('name');
      expect(person).toHaveProperty('coordinatorLevel');
      expect(person).toHaveProperty('subject');
      expect(person).toHaveProperty('degreeLevel');
      expect(person).toHaveProperty('universityName');
      expect(person).toHaveProperty('cityName');
      expect(person).toHaveProperty('countryName');
      expect(person).toHaveProperty('lat');
      expect(person).toHaveProperty('lng');

      // Should NOT have private fields
      expect(person).not.toHaveProperty('userId');
      expect(person).not.toHaveProperty('email');
      expect(person).not.toHaveProperty('passwordHash');
      expect(person).not.toHaveProperty('verified');
      expect(person).not.toHaveProperty('visibleOnMap');
    });

    it('should filter by subject (text search)', async () => {
      const mathResults = await getMapPeople({ subject: 'Math' });
      const physicsResults = await getMapPeople({ subject: 'Physics' });

      const mathNames = mathResults.map(p => p.name);
      const physicsNames = physicsResults.map(p => p.name);

      expect(mathNames).toContain('Verified Mentor');
      expect(mathNames).not.toContain('Hidden Mentor'); // Hidden shouldn't appear even if subject matches

      // Physics mentor is hidden, shouldn't appear
      expect(physicsNames.length).toBe(0);
    });

    it('should filter by degree level', async () => {
      const mastersResults = await getMapPeople({ degreeLevels: ['masters'] });

      expect(mastersResults.length).toBeGreaterThan(0);
      expect(mastersResults[0].degreeLevel).toBe('masters');

      const phdResults = await getMapPeople({ degreeLevels: ['phd'] });
      expect(phdResults.length).toBe(0); // No PhDs in test data
    });

    it('should filter by country', async () => {
      const byCountry = await getMapPeople({ countryIds: [testCountry.id] });

      expect(byCountry.length).toBeGreaterThan(0);
      expect(byCountry[0].countryName).toBe('Test Country');
    });

    it('should filter by city', async () => {
      const byCity = await getMapPeople({ cityIds: [testCity.id] });

      expect(byCity.length).toBeGreaterThan(0);
      expect(byCity[0].cityName).toBe('Test City');
    });

    it('should filter by university', async () => {
      const byUniversity = await getMapPeople({ universityIds: [testUniversity.id] });

      expect(byUniversity.length).toBeGreaterThan(0);
      expect(byUniversity[0].universityName).toBe('Test University');
    });

    it('should combine multiple filters', async () => {
      const filtered = await getMapPeople({
        subject: 'Mathematics',
        degreeLevels: ['masters'],
        countryIds: [testCountry.id],
      });

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered[0].subject).toContain('Mathematics');
      expect(filtered[0].degreeLevel).toBe('masters');
      expect(filtered[0].countryName).toBe('Test Country');
    });
  });

  describe('Rate limiting', () => {
    it('should allow requests within the limit', () => {
      const key = 'test-rate-limit-1';

      const result1 = checkRateLimit(key, 5, 60000);
      const result2 = checkRateLimit(key, 5, 60000);
      const result3 = checkRateLimit(key, 5, 60000);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(true);
    });

    it('should reject requests after limit is exceeded', () => {
      const key = 'test-rate-limit-2';
      const limit = 3;

      // Make 3 allowed requests
      checkRateLimit(key, limit, 60000);
      checkRateLimit(key, limit, 60000);
      checkRateLimit(key, limit, 60000);

      // 4th should be rejected
      const result = checkRateLimit(key, limit, 60000);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should use unique keys to avoid pollution', () => {
      // Different keys should be independent
      const result1 = checkRateLimit('key-a', 2, 60000);
      checkRateLimit('key-a', 2, 60000);
      const result2 = checkRateLimit('key-a', 2, 60000); // Rejected

      const result3 = checkRateLimit('key-b', 2, 60000); // Different key, allowed
      const result4 = checkRateLimit('key-b', 2, 60000); // Allowed
      const result5 = checkRateLimit('key-b', 2, 60000); // Rejected

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(false);
      expect(result3.allowed).toBe(true);
      expect(result4.allowed).toBe(true);
      expect(result5.allowed).toBe(false);
    });
  });
});
