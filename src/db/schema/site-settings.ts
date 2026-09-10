import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";

export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  menteeMessageRateLimitEnabled: boolean("mentee_message_rate_limit_enabled").notNull().default(false),
  contactRequestMessageEnabled: boolean("contact_request_message_enabled").notNull().default(false),
  homepageTitle: text("homepage_title"),
  homepageDescription: text("homepage_description"),
  contactRequestGuidance: text("contact_request_guidance"),
  contactRequestExamples: text("contact_request_examples"),
});
