import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { siteSettings } from '@/db/schema';
import { setMenteeMessageRateLimit } from '@/features/admin/actions/admin-actions';
import { createTestProfile, createTestUser } from './fixtures';

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mockAuth }));

describe('admin message settings', () => {
  let adminUserId: string;

  beforeEach(async () => {
    const admin = await createTestUser({ email: 'admin@university.example' });
    adminUserId = admin.userId;
    await createTestProfile({ userId: adminUserId, role: 'admin' });
    mockAuth.mockResolvedValue({ user: { id: adminUserId } });
  });

  it('persists the mentee message rate-limit toggle', async () => {
    expect((await setMenteeMessageRateLimit(true)).success).toBe(true);

    const [enabledSettings] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, 1));
    expect(enabledSettings?.menteeMessageRateLimitEnabled).toBe(true);

    expect((await setMenteeMessageRateLimit(false)).success).toBe(true);
    const [disabledSettings] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, 1));
    expect(disabledSettings?.menteeMessageRateLimitEnabled).toBe(false);
  });

  it('rejects non-admin users', async () => {
    const user = await createTestUser({ email: 'member@university.example' });
    await createTestProfile({ userId: user.userId, role: 'mentee' });
    mockAuth.mockResolvedValue({ user: { id: user.userId } });

    const result = await setMenteeMessageRateLimit(true);

    expect(result.error).toContain('Only administrators');
  });
});
