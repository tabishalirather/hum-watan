# Hum Watan

A free, verified platform for Kashmiri students and diaspora worldwide — discover a verified
mentor on an interactive map, request contact, and message safely.

## Stack

Next.js 16 (App Router) · TypeScript · TailwindCSS · shadcn/ui · Drizzle ORM · PostgreSQL ·
Auth.js (Credentials) · MapLibre GL · React Hook Form · Zod · TanStack Query · Vitest

## Architecture

Vertical-slice, feature-first structure — see `src/features/*`. Each feature owns its own
`actions/`, `queries/`, `components/`, and `validators/`. Only cross-feature primitives live in
`src/shared/`. See `src/db/schema/` for the data model. See `docs/MVP_ROADMAP.md` for the full
product roadmap and what's built vs. outstanding.

## Prerequisites

- Node.js 20+ (developed against Node 22)
- Docker (for local Postgres) — or your own reachable Postgres instance
- npm

## Getting started

1. **Copy the env file and fill in secrets:**

   ```bash
   cp .env.example .env
   openssl rand -base64 32   # paste the output into AUTH_SECRET
   ```

   `.env.example` ships with sane local defaults (Postgres on `localhost:5433`, app on
   `localhost:3000`). Only `AUTH_SECRET` needs a real value to run locally — email delivery
   (`RESEND_API_KEY`, `MAIL_FROM`) is optional for local dev (see [Email](#email) below).

2. **Start Postgres:**

   ```bash
   docker compose up -d
   ```

   This starts Postgres 16 on port `5433` with database `hum_watan`, and also creates a
   `hum_watan_test` database (via `scripts/init-test-db.sql`) used by the test suite. This init
   script only runs on first container creation — if you already have a `postgres_data` volume
   from before this test database existed, run
   `docker exec -it <container> psql -U postgres -c "CREATE DATABASE hum_watan_test;"` once
   manually, or remove the volume and let it reinitialize.

3. **Install dependencies and push the schema:**

   ```bash
   npm install
   npm run db:push
   npm run db:seed   # optional demo data — see console output for login credentials
   ```

   `npm run db:seed` prints working credentials, e.g. `mentor@example.com` / `password123`
   (already verified) and `mentee@example.com` / `password123`.

4. **Run the dev server:**

   ```bash
   npm run dev
   ```

   App runs at `http://localhost:3000`.

## Getting admin access locally

There's no self-serve admin signup. Admin status is a `role` column on a user's profile, and it's
further gated by `isAllowedAdminEmail` (`src/features/admin/lib/admin-email-policy.ts`) — only a
work/student email domain is accepted (common personal providers like gmail/yahoo/outlook/icloud
are rejected), unless the email matches the hardcoded bootstrap admin.

To get admin access on a local install:

1. Register a normal account through `/register` using a non-personal-domain email address (e.g.
   `you@yourcompany.com`), or use `npm run db:studio` to inspect existing users.
2. Promote that account to admin by setting its `profiles.role` to `'admin'` — either via
   `npm run db:studio` (edit the row directly) or a one-off script modeled on
   `scripts/promote-bootstrap-admin.ts` (that specific script only promotes the hardcoded
   original bootstrap email — copy and adjust it, or edit the row directly, for your own account).
3. Sign in and the `/admin` section will be available in navigation.

## Available scripts

```bash
npm run dev          # start the dev server
npm run build        # production build
npm run start        # run a production build
npm run lint         # ESLint
npm run test         # run the Vitest suite once (requires .env.test + hum_watan_test db)
npm run test:watch   # Vitest in watch mode
npm run db:generate  # generate a Drizzle migration from schema changes
npm run db:migrate   # apply generated migrations
npm run db:push      # push the current schema directly to the database (used in dev)
npm run db:studio    # open Drizzle Studio (browse/edit data)
npm run db:seed      # seed demo mentors/mentees
```

## Testing

Tests run against a dedicated `hum_watan_test` database (never your dev database) using
`.env.test`, which is already checked in with local defaults. The test setup
(`tests/setup.ts`) pushes the current schema to that database automatically before each run and
truncates all tables between tests, so no manual migration step is needed — just make sure
Postgres is running (`docker compose up -d`) and the `hum_watan_test` database exists (see step 2
above), then run:

```bash
npm run test
```

## Deploying schema changes to a separately-managed Postgres (e.g. Supabase)

If your production database is provisioned outside of this repo's `docker compose` setup (for
example, a managed Supabase Postgres instance), `drizzle-kit push` may refuse to run
non-interactively for changes it considers destructive (column renames, adding a unique
constraint to a non-empty table). `scripts/apply-supabase-schema.ts` applies the same DDL
directly and idempotently instead:

```bash
SUPABASE_DATABASE_URL="postgresql://..." npx tsx scripts/apply-supabase-schema.ts
```

Every statement in that script is safe to re-run. Treat the connection string as a secret — don't
commit it or paste it anywhere logged/shared.

## Email

Email delivery via Resend is currently disabled while the project is in testing/early launch.
Mentor referral confirmations are reviewed directly from the referee's Hum Watan profile instead
of via emailed link. `RESEND_API_KEY` / `MAIL_FROM` in `.env` can be left as placeholders for
local development.

## Current feature status

Implemented:

- Interactive world map (MapLibre GL) plotting verified mentors by university, with filters for
  subject, degree level, country, city, and university
- Mentee and mentor registration/login; mentor registration requires an existing verified mentor
  as referee, who reviews and approves/rejects the nomination in-app
- Public mentor/mentee profiles with per-field privacy toggles (university/city/bio)
- Chat requests → Connections inbox (sent/received/connected) → 1:1 threaded messaging with
  polling-based updates, unread badges, and configurable rate limits
- User report and block controls (with optional private explanation), enforced server-side
- Admin dashboard: mentor verification management, user search/deactivation, map visibility
  controls, site-content CMS (homepage copy, contact-request guidance), audit log
- Vitest test suite covering registration, chat requests, messaging, map API, moderation, and
  admin settings

Not yet implemented (see `docs/MVP_ROADMAP.md` for the full breakdown):

- Scheduling/appointments (Cal.com integration planned)
- A unified notifications system (chat/connections currently have their own nav badges only)
- Admin report review queue (reports/blocks can be created by users, but there's no admin UI to
  review and resolve them yet)
- Email and phone/SMS verification (email delivery is disabled pending a verified sending domain;
  SMS is not started)
- Production hardening: shared-store rate limiting, health checks, backup/restore procedure
