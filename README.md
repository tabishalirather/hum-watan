# Hum Watan

A free, verified platform for Kashmiri students and diaspora worldwide.

## Stack

Next.js 16 (App Router) · TypeScript · TailwindCSS · shadcn/ui · Drizzle ORM · PostgreSQL ·
Auth.js · MapLibre GL · React Hook Form · Zod · TanStack Query

## Architecture

Vertical-slice, feature-first structure — see `src/features/*`. Each feature owns its own
actions, queries, components, and validators. Only cross-feature primitives live in
`src/shared/`. See `src/db/schema/` for the data model.

## Getting started

1. Copy the env file and fill in secrets:

   ```bash
   cp .env.example .env
   openssl rand -base64 32   # paste into AUTH_SECRET
   ```

2. Start Postgres (or point `DATABASE_URL` at your own instance):

   ```bash
   docker compose up -d
   ```

3. Install dependencies and push the schema:

   ```bash
   npm install
   npm run db:push
   npm run db:seed   # optional demo data — see console output for login credentials
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

## Current MVP status

Implemented:

- Home page: interactive world map (MapLibre GL, OpenFreeMap tiles) plotting mentors/mentees by
  university, with a distinct larger marker for city/country coordinators
- Multi-select filters by subject (text), degree level, country, city, and university — any
  combination narrows the map, which pans/zooms to frame whatever's currently shown and resets
  to the world view once every filter is cleared
- Mentee sign up / login (direct)
- Mentor sign up / login, with a mandatory referral field — referee must already be a mentor,
  and confirms the nomination via an emailed link

Stubbed / not yet implemented (see docs for full scope):

- Referral confirmation emails are logged to the server console (`src/lib/mailer.ts`) — swap in
  a real provider (e.g. Resend) before launch
- Phone/SMS verification mentioned in the MVP docs is not implemented; mentees/mentors are
  verified via email/referral only for now
- In-app chat, admin/verification dashboards, and Cal.com scheduling are not yet built

## Map design notes

A few deliberate choices in `src/features/map/components/world-map.tsx`, worth knowing before
"fixing" them:

- **No political/administrative borders are rendered, anywhere in the world** — not just around
  Kashmir. The base map style ships country and disputed-boundary line layers; all of them are
  hidden (`BORDER_LAYER_IDS`) so the map never implies a position on any contested boundary.
- **Kashmir gets one unified label** instead of the base map data's fragmented, country-specific
  names (`Jammu and Kashmir`, `Azad Kashmir`). Those are suppressed and replaced with a single
  bold "KASHMIR" label, deliberately sized larger than every other place label on the map.
- `public/maplibre-gl-worker.mjs` and `public/maplibre-gl-shared.mjs` are static copies of
  maplibre-gl's own worker bundle. Turbopack doesn't serve the package's worker script at the
  relative URL maplibre-gl expects (derived from its own bundled `import.meta.url`), so without
  this the worker silently fails to load and no vector tiles — labels, water, land fill — ever
  render, only the raster terrain backdrop. `maplibregl.setWorkerUrl(...)` points at the static
  copies instead. If you bump the `maplibre-gl` version, re-copy both files from
  `node_modules/maplibre-gl/dist/`.
