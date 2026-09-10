import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateAccount } from '@/features/profile/actions/update-account';
import { db } from '@/db/client';
import { auditEvents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createTestUser, createTestProfile, getUserById } from './fixtures';

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));
vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

describe('updateAccount', () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser({ email: 'original@example.com', name: 'Original Name' });
    userId = user.userId;
    await createTestProfile({ userId, role: 'mentee' });

    mockAuth.mockResolvedValue({ user: { id: userId } } as any);
  });

  it('should reject if user is not signed in', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateAccount({ name: 'New Name', email: 'new@example.com' });

    expect('error' in result && result.error).toContain('must be signed in');
  });

  it('should reject an invalid email', async () => {
    const result = await updateAccount({ name: 'New Name', email: 'not-an-email' });

    expect('error' in result && result.error).toBeDefined();

    const user = await getUserById(userId);
    expect(user?.email).toBe('original@example.com');
  });

  it('should reject a name that is too short', async () => {
    const result = await updateAccount({ name: 'A', email: 'original@example.com' });

    expect('error' in result && result.error).toBeDefined();
  });

  it('should update name and email for a valid request', async () => {
    const result = await updateAccount({ name: 'Updated Name', email: 'updated@example.com' });

    expect('success' in result && result.success).toBe(true);

    const user = await getUserById(userId);
    expect(user?.name).toBe('Updated Name');
    expect(user?.email).toBe('updated@example.com');

    const audit = await db.query.auditEvents.findFirst({
      where: and(eq(auditEvents.entityId, userId), eq(auditEvents.action, 'account_updated')),
    });
    expect(audit).toBeDefined();
  });

  it('should reject an email already used by another account', async () => {
    await createTestUser({ email: 'taken@example.com' });

    const result = await updateAccount({ name: 'Updated Name', email: 'taken@example.com' });

    expect('error' in result && result.error).toContain('already exists');

    const user = await getUserById(userId);
    expect(user?.email).toBe('original@example.com');
  });

  it('should allow keeping the same email unchanged', async () => {
    const result = await updateAccount({ name: 'Renamed Only', email: 'original@example.com' });

    expect('success' in result && result.success).toBe(true);

    const user = await getUserById(userId);
    expect(user?.name).toBe('Renamed Only');
    expect(user?.email).toBe('original@example.com');
  });
});
