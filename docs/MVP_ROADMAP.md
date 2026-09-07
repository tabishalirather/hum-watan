# Hum Watan MVP Roadmap

This document tracks the MVP from the current working foundation to the first complete user journey:

> A mentee discovers a verified mentor, requests contact, communicates safely, schedules a session, and receives useful notifications.

Tick items with `[x]` as they are completed. Keep implementation details and decisions close to the checklist so this file remains the shared project memory.

## Product Principles

- [x] Keep the project feature-first and organized by vertical slices.
- [x] Use server components for authenticated reads where practical.
- [x] Use server actions for mutations where practical.
- [x] Keep public map data limited to what the map needs.
- [x] Keep current private profile reads and mutations restricted to the signed-in owner.
- [x] Audit mentor referral decisions, token confirmations, and profile updates.
- [ ] Keep future conversation data inaccessible to non-participants.
- [ ] Add reversible admin controls for important state transitions.

## Completed Foundation

### Authentication and Profiles

- [x] Credentials login and logout
- [x] Mentee registration
- [x] Mentor registration
- [x] Unverified mentors can log in while remaining hidden from the map
- [x] Role-specific mentor and mentee profiles
- [x] Mentor profile editing
- [x] Mentee profile editing
- [x] Verified and pending status banners
- [x] Verification status shown beneath the signed-in mentor's name

### Mentor Verification

- [x] Mentor enters a referee email during registration
- [x] Referee must already have a mentor profile
- [x] Pending mentor verification records
- [x] In-app verification request queue
- [x] Verified mentor can approve or reject requests
- [x] Approval and rejection require confirmation
- [x] Archived verification decisions
- [x] Archived history is collapsed by default
- [x] Atomic approval/rejection transitions
- [x] Email delivery kept disabled until a sending domain is available
- [ ] Re-enable email verification after domain setup
- [ ] Add expiring, single-use email confirmation tokens
- [ ] Add resend and delivery-failure handling

### Map Discovery

- [x] Interactive MapLibre world map
- [x] Verified mentors plotted by university location
- [x] Coordinator markers visually distinguished
- [x] Subject filter
- [x] Degree-level filter
- [x] Country filter
- [x] City filter
- [x] University filter
- [x] Map pans and zooms to filtered results
- [x] Map resets when filters are cleared
- [x] Kashmir map label and border decluttering behavior
- [x] Popup content rendered safely without HTML interpolation
- [x] Public map response excludes internal user IDs
- [x] Public map API input bounds
- [x] Public map API result limit
- [x] Basic per-IP map API rate limiting

### Navigation and Requests

- [x] Authenticated users see invite actions instead of join actions
- [x] Invite links use the configured public application URL
- [x] Dedicated Requests page
- [x] Verification requests tab
- [x] Verification request count in navigation
- [x] Chat requests tab placeholder
- [ ] Notification count and notification center

## Phase 1: Stabilize the Current MVP

### Testing

- [ ] Add a test runner and test command
- [ ] Test mentee registration validation
- [ ] Test mentor registration validation
- [ ] Test transactional registration failure behavior
- [ ] Test referee ownership authorization
- [ ] Test verified-referee approval authorization
- [ ] Test approve, reject, and already-resolved transitions
- [ ] Test concurrent approval and rejection attempts
- [ ] Test archived history and review timestamps
- [ ] Test verified-only map visibility
- [ ] Test public map response shape
- [ ] Test map API rate limits and input bounds
- [ ] Add seeded end-to-end smoke test

### Privacy and Account Controls

- [ ] Decide exactly which mentor fields are public
- [ ] Decide whether mentor names are shown on map popups
- [ ] Add mentor profile publish/unpublish control
- [ ] Add account deactivation
- [ ] Hide deactivated users from the map and requests
- [ ] Define behavior for deleted users with historical referrals/messages
- [ ] Add privacy policy and community guidelines
- [ ] Add a report-user entry point
- [ ] Add a block-user entry point

### Operational Hardening

- [x] Prevent stored XSS in map popups
- [x] Use safe parsing for registration server actions
- [x] Use transactions for user/profile creation
- [x] Apply referral review timestamp schema
- [x] Build production successfully
- [ ] Replace in-memory rate limiting with a shared store before multi-instance deployment
- [ ] Add structured server-side error logging without secrets
- [ ] Add health-check endpoint
- [ ] Add database backup and restore procedure
- [ ] Document migration and rollback procedure

## Phase 2: Chat Requests and Messaging

### Data Model

- [ ] Add `chat_requests` table
- [ ] Add request status enum: pending, accepted, rejected, blocked, cancelled
- [ ] Add `conversations` table
- [ ] Add conversation participants table
- [ ] Add `messages` table
- [ ] Add message read state
- [ ] Add created and updated timestamps
- [ ] Add soft-delete or moderation metadata
- [ ] Add indexes for participant and conversation lookups

### Chat Request Workflow

- [ ] Allow a mentee to request contact with a verified mentor
- [ ] Prevent duplicate pending requests
- [ ] Prevent requests to hidden, deactivated, or blocked mentors
- [ ] Show pending request state to the mentee
- [ ] Show incoming requests in Requests > Chat requests
- [ ] Allow mentor to approve a chat request
- [ ] Allow mentor to reject a chat request
- [ ] Allow either participant to cancel where appropriate
- [ ] Add block and report actions
- [ ] Authorize every action by participant and target ownership

### Conversations

- [ ] Add conversation list page
- [ ] Add conversation detail route
- [ ] Add chat window component
- [ ] Add send-message server action
- [ ] Add message validation schema
- [ ] Enforce message length limits
- [ ] Enforce message send rate limits
- [ ] Render messages as plain text
- [ ] Add unread message state
- [ ] Add empty, loading, and error states
- [ ] Use polling or refresh for MVP
- [ ] Defer realtime sockets until after the core workflow is validated

### Suggested Structure

```text
src/features/messaging/
  actions/
  queries/
  components/
  validators/
  types/
src/db/schema/chat-requests.ts
src/db/schema/messages.ts
src/app/messages/
```

## Phase 3: Scheduling and Appointments

### Product Decision

- [ ] Decide whether booking requires an accepted chat request
- [ ] Decide whether mentors expose one booking link or several event types
- [ ] Decide how mentors create and manage their Cal.com link
- [ ] Decide whether appointment data must be synchronized locally

### Recommended MVP Approach

Start with Cal.com-hosted booking links rather than building an internal calendar. This avoids implementing availability rules, timezone handling, cancellations, reminders, and meeting links too early.

### Scheduling Work

- [ ] Add scheduling link to mentor profile data
- [ ] Add mentor scheduling-link form field
- [ ] Validate scheduling URLs
- [ ] Show Book a conversation action on eligible mentor profiles
- [ ] Gate booking according to the approved chat policy
- [ ] Add appointment metadata table if local tracking is required
- [ ] Store external booking ID
- [ ] Store appointment status
- [ ] Store scheduled time and timezone
- [ ] Store meeting URL when available
- [ ] Add Cal.com webhook route if synchronization is required
- [ ] Add upcoming appointments view
- [ ] Add past appointments view
- [ ] Add cancellation handling
- [ ] Render times in the viewer's timezone with the original timezone available

### Suggested Structure

```text
src/features/appointments/
  actions/
  queries/
  components/
  validators/
  service/
  types/
src/db/schema/appointments.ts
src/app/appointments/
```

## Phase 4: Notifications

### Data Model

- [ ] Add `notifications` table
- [ ] Add recipient user ID
- [ ] Add notification type
- [ ] Add related entity IDs where useful
- [ ] Add structured payload data
- [ ] Add read/unread state
- [ ] Add created timestamp
- [ ] Add indexes for recipient and unread queries

### Notification Events

- [ ] New mentor verification request
- [ ] Mentor verification approved
- [ ] Mentor verification rejected
- [ ] New chat request
- [ ] Chat request accepted
- [ ] Chat request rejected
- [ ] New message
- [ ] Appointment created
- [ ] Appointment changed
- [ ] Appointment cancelled
- [ ] Appointment reminder

### Notification UI

- [ ] Add unread notification count to the navbar
- [ ] Add notification popover or page
- [ ] Add mark-as-read action
- [ ] Add mark-all-as-read action
- [ ] Link each notification to its relevant page
- [ ] Add empty and loading states
- [ ] Keep email/push delivery optional until provider decisions are final

### Suggested Structure

```text
src/features/notifications/
  actions/
  queries/
  components/
  types/
src/db/schema/notifications.ts
```

## Phase 5: Admin and Moderation

### Authorization

- [x] Add a reusable server-side admin authorization helper
- [x] Protect every admin query and mutation on the server
- [x] Do not rely on hidden navigation links for authorization
- [x] Add admin navigation only for admin users

### Verification Management

- [x] View pending mentor referrals
- [x] View confirmed mentor referrals
- [x] View rejected mentor referrals
- [x] Inspect mentor profile data
- [x] Override verification with a required reason
- [x] Revoke verification with a required reason
- [x] Preserve who performed the action and when

### User and Content Moderation

- [x] Search users
- [x] View user status and profile completeness
- [x] Deactivate accounts
- [x] Reactivate accounts
- [x] Hide profiles from the public map
- [ ] Review user reports
- [ ] Resolve reports
- [ ] Block abusive accounts
- [ ] Review referral and chat history where authorized

### Audit History

- [x] Add audit events table
- [x] Record admin verification overrides
- [x] Record account deactivation/reactivation
- [ ] Record moderation decisions
- [ ] Record report resolution
- [x] Ensure audit records cannot be edited through normal user actions

### Suggested Structure

```text
src/features/admin/
  actions/
  queries/
  components/
  validators/
  types/
src/db/schema/audit.ts
src/app/admin/
```

## Phase 6: Verification and Launch Readiness

### Email

- [ ] Configure a verified sending domain
- [ ] Re-enable Resend delivery
- [ ] Add expiring confirmation tokens
- [ ] Enforce single-use token transitions
- [ ] Add resend confirmation action
- [ ] Add delivery failure handling
- [ ] Decide how in-app approval and email fallback interact
- [ ] Update all user-facing copy when email is enabled

### Phone and SMS

- [ ] Decide whether SMS verification is required for MVP launch
- [ ] Select provider if required
- [ ] Add phone number storage and normalization
- [ ] Add one-time verification codes
- [ ] Add code expiry and attempt limits
- [ ] Add resend cooldown
- [ ] Avoid exposing phone numbers publicly

### Production Deployment

- [ ] Replace default database credentials
- [ ] Set a production `AUTH_SECRET`
- [ ] Configure HTTPS
- [ ] Set production `APP_URL` and `NEXT_PUBLIC_APP_URL`
- [ ] Configure verified email domain
- [ ] Establish database migration workflow
- [ ] Establish database backups
- [ ] Establish restore test procedure
- [ ] Replace in-memory rate limiting with Redis or another shared store
- [ ] Add environment-variable validation at startup
- [ ] Add health checks and basic monitoring
- [ ] Review dependency vulnerabilities
- [ ] Remove demo credentials and seed data from production

## End-to-End MVP Smoke Test

- [ ] Register a mentee
- [ ] Log in as the mentee
- [ ] Browse verified mentors on the map
- [ ] Filter mentors by subject, degree, country, city, and university
- [ ] Open a verified mentor profile
- [ ] Send a chat request
- [ ] Log in as the mentor
- [ ] See the chat request in Requests > Chat requests
- [ ] Approve the chat request
- [ ] Exchange messages
- [ ] Book a session
- [ ] View the appointment
- [ ] Receive and read notifications
- [ ] Cancel or update the appointment
- [ ] Report or block a user
- [ ] Confirm admin can moderate the relevant records

## Recommended Build Order

1. Add tests and finalize privacy rules.
2. Implement chat requests and basic messaging.
3. Add persistent notifications and unread counts.
4. Integrate Cal.com-hosted scheduling.
5. Build admin and moderation tools.
6. Re-enable domain-backed email verification.
7. Decide and implement SMS only if required.
8. Complete production deployment hardening.

## Open Product Decisions

- Should chat be mentee-to-mentor only for MVP? Recommended: yes.
- Should booking require accepted chat? Recommended: yes.
- Should mentor booking links be public or private? Recommended: private until chat acceptance.
- Is SMS required for launch trust? Recommended: defer until the core journey is validated.
- Will Cal.com use one platform account with mentor event links or separate mentor accounts?
- Which user/profile fields are public on the map?
