import { pgTable, text, timestamp, uuid, pgEnum, boolean } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { universities } from "./geo";

export const userRoleEnum = pgEnum("user_role", ["mentee", "mentor", "admin"]);

export const degreeLevelEnum = pgEnum("degree_level", [
  "bachelors",
  "masters",
  "phd",
  "other",
]);

export const coordinatorLevelEnum = pgEnum("coordinator_level", [
  "none",
  "city",
  "country",
]);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  role: userRoleEnum("role").notNull(),
  bio: text("bio"),
  subject: text("subject"),
  degreeLevel: degreeLevelEnum("degree_level"),
  universityId: uuid("university_id").references(() => universities.id, {
    onDelete: "set null",
  }),
  coordinatorLevel: coordinatorLevelEnum("coordinator_level").notNull().default("none"),
  verified: boolean("verified").notNull().default(false),
  visibleOnMap: boolean("visible_on_map").notNull().default(true),
  scholarshipStatus: text("scholarship_status"),
  // Mentee-only fields. Mentees are aspiring students, not yet enrolled
  // anywhere, so they don't have a university/subject/degree to report —
  // instead they describe what they're aiming for and what help they want.
  targetPrograms: text("target_programs"),
  background: text("background"),
  helpNeeded: text("help_needed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  connectionsViewedAt: timestamp("connections_viewed_at"),
  // Marks when this user last looked at their own verification outcome.
  // Needed because a referee (or an admin) resolves the referral, not the
  // mentor it concerns, so nothing the mentor does would otherwise clear
  // "you were approved/rejected" from their notifications.
  verificationsViewedAt: timestamp("verifications_viewed_at"),
  // Set when an account is barred from starting new connections or sending
  // messages, either by an admin or automatically once it accumulates
  // REPORT_RESTRICTION_THRESHOLD outstanding reports. Distinct from
  // users.is_active, which blocks signing in entirely: a restricted user can
  // still log in and see their own account.
  restrictedAt: timestamp("restricted_at"),
  // Per-field visibility on the public profile page (/people/[userId]).
  // Name and role are never hideable — messaging depends on knowing who
  // you're talking to. These only apply to mentors, the only role with
  // these fields.
  showUniversity: boolean("show_university").notNull().default(true),
  showCity: boolean("show_city").notNull().default(true),
  showBio: boolean("show_bio").notNull().default(true),
});
