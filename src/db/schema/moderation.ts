import { index, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const reportReasonEnum = pgEnum("report_reason", [
	"harassment",
	"spam",
	"inappropriate_content",
	"scam_or_fraud",
	"privacy_concern",
	"other",
]);

export const reportStatusEnum = pgEnum("report_status", ["open", "reviewed", "resolved", "dismissed"]);

export const reports = pgTable(
	"reports",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		reporterUserId: uuid("reporter_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
		reportedUserId: uuid("reported_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
		reason: reportReasonEnum("reason").notNull(),
		details: text("details"),
		status: reportStatusEnum("status").notNull().default("open"),
		reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, { onDelete: "set null" }),
		reviewedAt: timestamp("reviewed_at"),
		resolution: text("resolution"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("reports_status_idx").on(table.status, table.createdAt),
		index("reports_reported_user_idx").on(table.reportedUserId, table.createdAt),
		index("reports_reporter_idx").on(table.reporterUserId, table.createdAt),
	],
);

export const userBlocks = pgTable(
	"user_blocks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		blockerUserId: uuid("blocker_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
		blockedUserId: uuid("blocked_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		unique("user_blocks_pair_unique").on(table.blockerUserId, table.blockedUserId),
		index("user_blocks_blocker_idx").on(table.blockerUserId, table.createdAt),
		index("user_blocks_blocked_idx").on(table.blockedUserId, table.createdAt),
	],
);