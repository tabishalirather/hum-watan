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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
