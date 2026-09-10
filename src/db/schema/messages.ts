import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { chatRequests } from "./chat-requests";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatRequestId: uuid("chat_request_id")
      .notNull()
      .references(() => chatRequests.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    readAt: timestamp("read_at"),
  },
  (table) => [index("messages_chat_request_idx").on(table.chatRequestId, table.createdAt)],
);
