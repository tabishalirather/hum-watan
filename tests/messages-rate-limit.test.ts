import { beforeEach, describe, expect, it, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { chatRequests, messages, siteSettings } from '@/db/schema';
import { sendMessage } from '@/features/messages/actions/send-message';
import { createTestChatRequest, createTestProfile, createTestUser } from './fixtures';

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mockAuth }));

describe('mentee message rate limit', () => {
	let menteeUserId: string;
	let mentorUserId: string;
	let chatRequestId: string;

	beforeEach(async () => {
		const mentee = await createTestUser({ email: 'rate-limit-mentee@example.com' });
		menteeUserId = mentee.userId;
		await createTestProfile({ userId: menteeUserId, role: 'mentee' });
		const mentor = await createTestUser({ email: 'rate-limit-mentor@example.com' });
		mentorUserId = mentor.userId;
		await createTestProfile({ userId: mentorUserId, role: 'mentor' });
		const request = await createTestChatRequest({ requesterUserId: menteeUserId, recipientUserId: mentorUserId, status: 'accepted' });
		chatRequestId = request.id;
		mockAuth.mockResolvedValue({ user: { id: menteeUserId } });
		await db.insert(siteSettings).values({ id: 1, menteeMessageRateLimitEnabled: true });
	});

	it('allows two unanswered mentee messages and rejects the third', async () => {
		expect((await sendMessage({ chatRequestId, body: 'First' })).success).toBe(true);
		expect((await sendMessage({ chatRequestId, body: 'Second' })).success).toBe(true);
		const result = await sendMessage({ chatRequestId, body: 'Third' });
		expect(result.error).toBe('Wait for the mentor to reply before sending another message.');
		const stored = await db.select().from(messages).where(eq(messages.chatRequestId, chatRequestId));
		expect(stored).toHaveLength(2);
	});

	it('resets after a mentor reply and never restricts mentor sends', async () => {
		await sendMessage({ chatRequestId, body: 'First' });
		await sendMessage({ chatRequestId, body: 'Second' });
		mockAuth.mockResolvedValue({ user: { id: mentorUserId } });
		expect((await sendMessage({ chatRequestId, body: 'Mentor reply' })).success).toBe(true);
		mockAuth.mockResolvedValue({ user: { id: menteeUserId } });
		expect((await sendMessage({ chatRequestId, body: 'After reply' })).success).toBe(true);
	});

	it('is a no-op when disabled', async () => {
		await db.update(siteSettings).set({ menteeMessageRateLimitEnabled: false }).where(eq(siteSettings.id, 1));
		for (const body of ['First', 'Second', 'Third']) {
			expect((await sendMessage({ chatRequestId, body })).success).toBe(true);
		}
	});
});
