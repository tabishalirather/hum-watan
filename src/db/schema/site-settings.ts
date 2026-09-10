import { boolean, integer, pgTable } from "drizzle-orm/pg-core";

export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  menteeMessageRateLimitEnabled: boolean("mentee_message_rate_limit_enabled").notNull().default(false),
});
