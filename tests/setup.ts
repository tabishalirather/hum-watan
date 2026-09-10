import dotenv from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';
import { beforeAll, afterEach } from 'vitest';

// Load .env.test explicitly
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Ensure test env is loaded
if (!process.env.DATABASE_URL?.includes('hum_watan_test')) {
  throw new Error(
    `Tests must run with .env.test loaded. Got DATABASE_URL: ${process.env.DATABASE_URL}`
  );
}

import { db } from '@/db/client';

beforeAll(async () => {
  // Run migrations on the test database
  try {
    execSync('dotenv -e .env.test -- drizzle-kit push', { stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to push schema to test database:', error);
    throw error;
  }
});

afterEach(async () => {
  // Truncate all tables for test isolation
  const tablesToTruncate = [
      'messages',
      'chat_requests',
      'site_settings',
    'mentor_referrals',
    'profiles',
    'audit_events',
    'verification_tokens',
    'sessions',
    'accounts',
    'users',
    'universities',
    'cities',
    'countries',
  ];

  for (const table of tablesToTruncate) {
    try {
      await db.execute(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
    } catch (error) {
      // Table might not exist in schema yet, continue
    }
  }
});
