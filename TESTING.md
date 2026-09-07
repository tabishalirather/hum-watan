# Testing Guide

This project uses **Vitest** with a real Postgres test database for testing.

## Initial Setup (One-Time)

### 1. Recreate Docker containers with test database init script

The `docker-compose.yml` now includes an init script that creates a test database (`hum_watan_test`). You must refresh your Docker containers to apply this:

```bash
docker compose down -v    # Stop and remove volumes
docker compose up -d      # Restart with new init script
```

This creates both `hum_watan` (dev) and `hum_watan_test` (test) databases in the same Postgres container.

### 2. Install test dependencies

Dependencies are already listed in `package.json`. If you haven't run `npm install` yet:

```bash
npm install
```

## Running Tests

### Run all tests once
```bash
npm test
```

### Run tests in watch mode (re-runs on file changes)
```bash
npm run test:watch
```

### Run tests for a specific file
```bash
npx vitest tests/registration.test.ts
```

### Run tests with coverage
```bash
npm test -- --coverage
```

## Test Structure

Tests are in the `tests/` directory:

- **`registration.test.ts`** — Tests for `registerMentee()` and `registerMentor()` server actions
  - Covers validation, duplicate email rejection, referee authorization, atomic transactions

- **`review-mentor-referral.test.ts`** — Tests for the mentor verification workflow
  - Covers authorization (only verified mentors can review), approval/rejection, audit events, concurrent access races

- **`map-api.test.ts`** — Tests for the public map API
  - Covers visibility filters (verified/visible/active only), response shape safety, subject/degree/country filters, rate limiting

## Test Database Isolation

Each test file runs against the test database (`hum_watan_test`). Between test cases:

1. **Setup phase** (`beforeAll`): Migrations run via `drizzle-kit push` to sync schema
2. **Test runs**: Each `it()` case executes
3. **Cleanup phase** (`afterEach`): All tables are truncated for isolation

This ensures tests don't interfere with each other.

## Environment

Tests load from `.env.test`, which points to the test database:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5433/hum_watan_test
```

Your development database (`.env`) remains untouched.

## Troubleshooting

### "Cannot connect to localhost:5433/hum_watan_test"
- Ensure Docker is running: `docker ps` should show the postgres container
- Ensure containers were recreated after updating docker-compose.yml: `docker compose down -v && docker compose up -d`
- Check the database was created: `docker exec -it <postgres-container> psql -U postgres -l` should list `hum_watan_test`

### "Tests timeout or hang"
- Check .env.test has correct DATABASE_URL
- Ensure `dotenv` is installed and vitest is configured to load it via `tests/setup.ts`
- Check postgres is accepting connections: `docker logs <container-name>`

### "Lint errors about `describe`, `it`, `expect` being undefined"
- These are handled by the ESLint config (`eslint.config.mjs`), which defines vitest globals for `tests/**/*.ts` files
- Run `npm run lint` to verify

## Adding New Tests

1. Create a new `.test.ts` file in `tests/`
2. Import fixtures and utilities:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { createTestUser, createTestProfile } from './fixtures';
   ```
3. Use fixtures to create test data:
   ```typescript
   const { userId } = await createTestUser({ email: 'test@example.com' });
   const profile = await createTestProfile({ userId, role: 'mentor' });
   ```
4. Run `npm test` — it will automatically discover and run your new test

## Fixtures

Reusable test data builders are in `tests/fixtures.ts`:

- `createTestCountry()` — Create a geography entry
- `createTestCity()` — Create a city
- `createTestUniversity()` — Create a university
- `createTestUser()` — Create a user (with bcrypt-hashed password)
- `createTestProfile()` — Create a mentor/mentee profile
- `createTestMentorReferral()` — Create a referral record
- `getUserById()`, `getProfileByUserId()`, `getMentorReferralById()` — Query helpers

Example:
```typescript
const { userId, email } = await createTestUser({ name: 'Alice' });
const profile = await createTestProfile({
  userId,
  role: 'mentor',
  verified: true,
  subject: 'Mathematics',
});
```

## Roadmap Coverage

Current tests cover these items from `docs/MVP_ROADMAP.md` Phase 1:

✅ Test mentee registration validation
✅ Test mentor registration validation
✅ Test transactional registration failure behavior
✅ Test referee ownership authorization
✅ Test verified-referee approval authorization
✅ Test approve, reject, already-resolved transitions
✅ Test concurrent approval/rejection attempts
✅ Test archived history and review timestamps
✅ Test verified-only map visibility
✅ Test public map response shape
✅ Test map API rate limits and input bounds

Remaining Phase 1 items (tests to add):
- [ ] End-to-end smoke test (full user journey)
- [ ] Account deactivation behavior
- [ ] Privacy and blocking rules
