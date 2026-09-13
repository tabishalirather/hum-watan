import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { passwordResetTokens, users } from '@/db/schema';
import { requestPasswordReset } from '@/features/auth/actions/request-password-reset';
import { resetPassword } from '@/features/auth/actions/reset-password';
import { hashPasswordResetToken } from '@/features/auth/lib/password-reset-token';
import { createTestUser } from './fixtures';
import bcrypt from 'bcryptjs';

const { mockSendMail } = vi.hoisted(() => ({ mockSendMail: vi.fn() }));
vi.mock('@/lib/mailer', () => ({ sendMail: mockSendMail }));

describe('password reset', () => {
  beforeEach(() => {
    mockSendMail.mockReset();
    mockSendMail.mockResolvedValue(undefined);
  });

  it('creates a token and emails a reset link for a known email', async () => {
    const user = await createTestUser({ email: 'reset-me@example.com' });

    const result = await requestPasswordReset({ email: user.email });

    expect('success' in result && result.success).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const [to, , text] = mockSendMail.mock.calls[0];
    expect(to).toBe(user.email);
    expect(text).toContain('/reset-password?token=');

    const [record] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, user.userId));
    expect(record).toBeDefined();
    expect(record.usedAt).toBeNull();
  });

  it('returns a generic success response for an unknown email without sending mail', async () => {
    const result = await requestPasswordReset({ email: 'nobody@example.com' });

    expect('success' in result && result.success).toBe(true);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('resets the password with a valid token and invalidates it after use', async () => {
    const user = await createTestUser({ email: 'reset-flow@example.com', password: 'oldpassword123' });
    await requestPasswordReset({ email: user.email });
    const token = mockSendMail.mock.calls[0][2].match(/token=([\w-]+)/)?.[1] as string;

    const result = await resetPassword({ token, password: 'newpassword123', confirmPassword: 'newpassword123' });
    expect('success' in result && result.success).toBe(true);

    const [updatedUser] = await db.select().from(users).where(eq(users.id, user.userId));
    expect(await bcrypt.compare('newpassword123', updatedUser.passwordHash!)).toBe(true);

    const reuse = await resetPassword({ token, password: 'anotherpassword123', confirmPassword: 'anotherpassword123' });
    expect('error' in reuse).toBe(true);
  });

  it('rejects an expired token', async () => {
    const user = await createTestUser({ email: 'expired@example.com' });
    const token = 'expired-token';
    await db.insert(passwordResetTokens).values({
      userId: user.userId,
      tokenHash: hashPasswordResetToken(token),
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await resetPassword({ token, password: 'newpassword123', confirmPassword: 'newpassword123' });
    expect('error' in result).toBe(true);
  });

  it('rejects mismatched password confirmation', async () => {
    const result = await resetPassword({ token: 'whatever', password: 'newpassword123', confirmPassword: 'different123' });
    expect('error' in result).toBe(true);
  });
});
