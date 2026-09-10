import { pgTable, text, timestamp, uuid, pgEnum, index } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const chatRequestStatusEnum = pgEnum("chat_request_status", [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
]);

export const chatRequests = pgTable(
  "chat_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    menteeUserId: uuid("mentee_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mentorUserId: uuid("mentor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: chatRequestStatusEnum("status").notNull().default("pending"),
    message: text("message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at"),
  },
  (table) => [
    index("chat_requests_mentor_idx").on(table.mentorUserId, table.status),
    index("chat_requests_mentee_idx").on(table.menteeUserId, table.status),
  ],
);
