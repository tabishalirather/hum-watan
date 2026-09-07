import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reviewMentorReferral } from '@/features/auth/actions/review-mentor-referral';
import { db } from '@/db/client';
import { profiles, mentorReferrals, auditEvents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createTestUser, createTestProfile, createTestMentorReferral, getMentorReferralById } from './fixtures';

// Mock the auth() function
const mockAuth = vi.fn();
vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

import * as authModule from '@/auth';

describe('reviewMentorReferral', () => {
  let refereeUserId: string;
  let mentorUserId: string;
  let referralId: string;

  beforeEach(async () => {
    // Create referee mentor (verified)
    const { userId } = await createTestUser({
      email: 'referee@example.com',
      name: 'Referee Mentor',
    });
    refereeUserId = userId;

    await createTestProfile({
      userId: refereeUserId,
      role: 'mentor',
      verified: true,
    });

    // Create mentee being referred
    const { userId: mentorId } = await createTestUser({
      email: 'referred-mentor@example.com',
      name: 'Referred Mentor',
    });
    mentorUserId = mentorId;

    await createTestProfile({
      userId: mentorUserId,
      role: 'mentor',
      verified: false,
    });

    // Create pending referral
    const referral = await createTestMentorReferral({
      mentorUserId,
      refereeUserId,
      status: 'pending',
    });
    referralId = referral.id;

    // Mock auth to return our referee
    mockAuth.mockResolvedValue({
      user: { id: refereeUserId },
    } as any);
  });

  it('should reject if user is not signed in', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await reviewMentorReferral(referralId, 'confirmed');

    expect('error' in result && result.error).toContain('must be signed in');
  });

  it('should reject if reviewer is not a verified mentor', async () => {
    // Create a non-mentor user
    const { userId: nonMentorId } = await createTestUser({
      email: 'notmentor@example.com',
    });

    await createTestProfile({
      userId: nonMentorId,
      role: 'mentee',
    });

    mockAuth.mockResolvedValue({
      user: { id: nonMentorId },
    } as any);

    const result = await reviewMentorReferral(referralId, 'confirmed');

    expect('error' in result && result.error).toContain('verified mentors');
  });

  it('should reject if reviewer is unverified mentor', async () => {
    // Create unverified mentor
    const { userId: unverifiedMentorId } = await createTestUser({
      email: 'unverified@example.com',
    });

    await createTestProfile({
      userId: unverifiedMentorId,
      role: 'mentor',
      verified: false,
    });

    mockAuth.mockResolvedValue({
      user: { id: unverifiedMentorId },
    } as any);

    const result = await reviewMentorReferral(referralId, 'confirmed');

    expect('error' in result && result.error).toContain('verified mentors');
  });

  it('should allow verified mentor to confirm a pending referral', async () => {
    const result = await reviewMentorReferral(referralId, 'confirmed');

    expect('success' in result && result.success).toBe(true);

    // Verify referral status was updated
    const referral = await getMentorReferralById(referralId);
    expect(referral?.status).toBe('confirmed');
    expect(referral?.confirmedAt).toBeDefined();
    expect(referral?.reviewedAt).toBeDefined();

    // Verify referred mentor is now verified
    const mentorProfile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, mentorUserId),
    });
    expect(mentorProfile?.verified).toBe(true);

    // Verify audit event was created
    const auditEvent = await db.query.auditEvents.findFirst({
      where: and(
        eq(auditEvents.entityId, referralId),
        eq(auditEvents.action, 'mentor_referral_approved')
      ),
    });
    expect(auditEvent).toBeDefined();
    expect(auditEvent?.actorUserId).toBe(refereeUserId);
  });

  it('should allow verified mentor to reject a pending referral', async () => {
    const result = await reviewMentorReferral(referralId, 'rejected');

    expect('success' in result && result.success).toBe(true);

    // Verify referral status was updated
    const referral = await getMentorReferralById(referralId);
    expect(referral?.status).toBe('rejected');
    expect(referral?.confirmedAt).toBeNull();
    expect(referral?.reviewedAt).toBeDefined();

    // Verify referred mentor stays unverified
    const mentorProfile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, mentorUserId),
    });
    expect(mentorProfile?.verified).toBe(false);

    // Verify audit event was created
    const auditEvent = await db.query.auditEvents.findFirst({
      where: and(
        eq(auditEvents.entityId, referralId),
        eq(auditEvents.action, 'mentor_referral_rejected')
      ),
    });
    expect(auditEvent).toBeDefined();
  });

  it('should prevent double-approval (already resolved)', async () => {
    // Confirm the referral
    await reviewMentorReferral(referralId, 'confirmed');

    // Try to confirm again
    const result = await reviewMentorReferral(referralId, 'confirmed');

    expect('error' in result && result.error).toContain('no longer pending');
  });

  it('should prevent review by wrong referee', async () => {
    // Create different referee
    const { userId: otherRefereeId } = await createTestUser({
      email: 'other-referee@example.com',
    });

    await createTestProfile({
      userId: otherRefereeId,
      role: 'mentor',
      verified: true,
    });

    mockAuth.mockResolvedValue({
      user: { id: otherRefereeId },
    } as any);

    const result = await reviewMentorReferral(referralId, 'confirmed');

    expect('error' in result && result.error).toContain('no longer pending');

    // Verify referral unchanged
    const referral = await getMentorReferralById(referralId);
    expect(referral?.status).toBe('pending');
  });

  it('should handle concurrent approve attempts on same referral', async () => {
    // Mock two different reviewers trying to approve the same referral
    // This tests the WHERE status='pending' guard

    // Create second referee
    const { userId: secondRefereeId } = await createTestUser({
      email: 'second-referee@example.com',
    });

    await createTestProfile({
      userId: secondRefereeId,
      role: 'mentor',
      verified: true,
    });

    // Create another referral for the same mentor
    const referral2 = await createTestMentorReferral({
      mentorUserId,
      refereeUserId: secondRefereeId,
      status: 'pending',
    });

    // First reviewer approves
    mockAuth.mockResolvedValue({
      user: { id: refereeUserId },
    } as any);

    const result1 = reviewMentorReferral(referral2.id, 'confirmed');

    // Second reviewer tries to approve simultaneously
    mockAuth.mockResolvedValue({
      user: { id: secondRefereeId },
    } as any);

    const result2 = reviewMentorReferral(referral2.id, 'confirmed');

    // Both settle
    const [res1, res2] = await Promise.all([result1, result2]);

    // Exactly one should succeed (both should try but only one wins due to WHERE status='pending')
    const successes = [res1, res2].filter(r => 'success' in r && r.success).length;
    const failures = [res1, res2].filter(r => 'error' in r && r.error).length;

    expect(successes).toBe(1);
    expect(failures).toBe(1);

    // Final state should be confirmed
    const final = await getMentorReferralById(referral2.id);
    expect(final?.status).toBe('confirmed');
  });
});
