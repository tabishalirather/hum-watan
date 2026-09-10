# Brief: mentee message rate limit + chat UX polish

## Context

Repo: Next.js 16 + Drizzle ORM + Postgres (Supabase in prod, local Docker Postgres in dev). Feature-first structure under `src/features/*`. Vitest test suite under `tests/`. Chat between a mentee and mentor happens over an accepted `chat_requests` row, with messages in the `messages` table — one thread per `chat_requests.id`, no group chat.

Key existing files:
- `src/db/schema/chat-requests.ts` — `chatRequests` table, `requesterUserId`/`recipientUserId`, `status` enum (`pending | accepted | rejected | cancelled`).
- `src/db/schema/messages.ts` — `messages` table (`chatRequestId`, `senderId`, `body`, `createdAt`, `readAt`).
- `src/db/schema/profiles.ts` — `profiles` table, has `role` (`mentee | mentor | admin`).
- `src/features/messages/actions/send-message.ts` — server action that inserts a message. Currently just validates auth + membership + `status === "accepted"`, no rate limiting at all.
- `src/features/messages/validators/message-schema.ts` — Zod schema, 1–2000 char body.
- `src/features/messages/components/message-thread.tsx` — client component. Polls `/api/connections/[chatRequestId]/messages` every 4s via React Query (`refetchInterval: 4000`), renders messages, has a `<textarea>` + send `<Button>`. No loading skeleton, no distinct error UI beyond a plain text line under the form.
- `src/app/connections/[chatRequestId]/page.tsx` — server component, loads the thread, marks messages read on visit.
- `src/features/admin/` — admin feature slice (`actions/`, `components/`, `queries/`, `lib/require-admin.ts` for auth-gating admin routes). `src/app/admin/page.tsx` is the dashboard. No existing settings/feature-flag table anywhere in `src/db/schema/`.

Full test suite lives in `tests/` (Vitest), including `tests/chat-requests.test.ts` — follow its patterns (uses `tests/fixtures.ts` and `tests/setup.ts`) for any new tests.

## What to build

### 1. Admin-toggleable mentee message rate limit

**Rule**: When enabled, a mentee may have at most **2 consecutive unanswered messages** in a given chat thread — i.e. they can send an initial message and one follow-up, but not a third, until the mentor sends at least one message in that thread. This applies **only to mentees** sending in a thread (never restricts mentors). The counter resets to 0 the moment the mentor sends any message in that thread.

- Add a `site_settings` (or similarly named) table/row — a single-row settings table is fine for MVP, doesn't need to be a generic key-value store unless that's clearly less work. Add a boolean column, e.g. `mentee_message_rate_limit_enabled`, defaulting to `false` (off) so this ships inert until an admin turns it on.
- Add an admin UI control (toggle/switch) in `src/app/admin/` (or a new admin settings sub-page if that fits the existing admin nav better) to flip this boolean via a server action, following the auth-gating pattern in `src/features/admin/lib/require-admin.ts`.
- Enforce the rule server-side in `src/features/messages/actions/send-message.ts` (this is the only place messages are inserted — do not duplicate the check client-side as the sole guard, client-side is UX-only). When the setting is on and the sender is a mentee:
  - Count consecutive messages in the thread sent by the mentee since the mentor's last message (or since thread start if the mentor hasn't sent anything yet).
  - If that count is already 2, reject the send with a clear error (e.g. `{ error: "Wait for the mentor to reply before sending another message." }`) — do not insert the message.
- Push the required Supabase schema changes using the same idempotent-SQL-script pattern as `scripts/apply-supabase-schema.ts` (drizzle-kit push can't run non-interactively for some DDL against the hosted Supabase instance in this project — check that script for the established pattern before adding new statements).
- Add test coverage in `tests/` following the existing `chat-requests.test.ts` / `fixtures.ts` conventions: mentee can send 2 messages back-to-back when no mentor reply exists, 3rd is rejected while the flag is on; a mentor reply resets the count; the whole rule is a no-op when the flag is off; the rule never restricts the mentor's own sends.

### 2. Chat UX: loading/error states

In `src/features/messages/components/message-thread.tsx` (and its send flow):
- Add a real loading state for the initial message fetch (skeleton/spinner) rather than relying solely on `initialData` from the server — matters for slow connections or the isolated Vitest/E2E harness.
- Distinguish between the send button being disabled because (a) the draft is empty, (b) a send is in flight, and (c) the mentee has hit the new rate limit — each should have a distinct, human-readable UI, not just a generic disabled state. For (c) specifically: disable the send button and show inline copy like "Waiting for [mentor name] to reply" (reuse the `otherPartyName` prop already passed into this component) instead of the generic red error line the plain validation-failure path uses.
- Improve the polling-failure UX: if `fetchMessages` throws (e.g. network drop), don't let the thread silently go blank — show a small inline "couldn't refresh, retrying…" indicator rather than nothing, and don't clear already-loaded messages.
- Keep everything consistent with existing Tailwind utility patterns already in the file (no new component library, no new design system).

## Constraints / house rules for this project

- No new abstractions beyond what's needed — this is a small, scoped change, not a generic rate-limiting framework.
- Server actions are the mutation pattern here (see `send-message.ts`, `send-chat-request.ts`) — don't introduce API routes for this unless there's a concrete reason.
- Run `npx tsc --noEmit` and `npx vitest run` before considering this done — the project currently has 52 passing tests and a clean typecheck; both must stay green.
- Don't touch mentor-side sending logic at all — this rule is mentee-only by design.
- Don't add block/report features or general notification systems — those are separate, out-of-scope roadmap items (see `docs/MVP_ROADMAP.md`).
