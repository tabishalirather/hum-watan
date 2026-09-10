import { pgTable, text, timestamp, uuid, pgEnum, index } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const chatRequestStatusEnum = pgEnum("chat_request_status", [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
]);

// The requester can be a mentee OR a mentor (mentors can network with each
// other too) - the recipient is always a mentor, since that's the only role
// listed on the map. Column names reflect that: neither side implies a
// fixed role for the requester.
export const chatRequests = pgTable(
  "chat_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterUserId: uuid("requester_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: chatRequestStatusEnum("status").notNull().default("pending"),
    message: text("message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at"),
  },
  (table) => [
    index("chat_requests_recipient_idx").on(table.recipientUserId, table.status),
    index("chat_requests_requester_idx").on(table.requesterUserId, table.status),
  ],
);
