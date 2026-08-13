import { pgTable, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const referralStatusEnum = pgEnum("referral_status", [
  "pending",
  "confirmed",
  "rejected",
]);

export const mentorReferrals = pgTable("mentor_referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  mentorUserId: uuid("mentor_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  refereeEmail: text("referee_email").notNull(),
  refereeUserId: uuid("referee_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  status: referralStatusEnum("status").notNull().default("pending"),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
});
