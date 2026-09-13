import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), email: text("email").notNull().unique(),
  name: text("name").notNull(), createdAt: integer("created_at").notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), title: text("title").notNull(),
  filename: text("filename"), contentType: text("content_type"), storageKey: text("storage_key"),
  sourceUrl: text("source_url"), sourceType: text("source_type").notNull().default("upload"),
  duration: real("duration").notNull().default(0), language: text("language").notNull().default("id"),
  status: text("status").notNull().default("draft"), progress: integer("progress").notNull().default(0),
  error: text("error"), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
});

export const clips = sqliteTable("clips", {
  id: text("id").primaryKey(), projectId: text("project_id").notNull(), startTime: real("start_time").notNull(),
  endTime: real("end_time").notNull(), score: integer("score").notNull(), title: text("title").notNull(),
  hook: text("hook").notNull(), caption: text("caption").notNull(), subtitles: text("subtitles").notNull().default("[]"),
  style: text("style").notNull().default("bold"), faceTracking: integer("face_tracking", { mode: "boolean" }).notNull().default(true),
  hookOverlay: integer("hook_overlay", { mode: "boolean" }).notNull().default(true), status: text("status").notNull().default("ready"),
  renderedKey: text("rendered_key"), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
});

export const transcripts = sqliteTable("transcripts", {
  projectId: text("project_id").primaryKey(), text: text("text").notNull(), segments: text("segments").notNull().default("[]"),
  provider: text("provider").notNull(), createdAt: integer("created_at").notNull(),
});

export const channels = sqliteTable("channels", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), platform: text("platform").notNull(),
  name: text("name").notNull(), externalId: text("external_id"), status: text("status").notNull().default("pending"),
  watchEnabled: integer("watch_enabled", { mode: "boolean" }).notNull().default(false), lastCheckedAt: integer("last_checked_at"), createdAt: integer("created_at").notNull(),
});

export const postingRules = sqliteTable("posting_rules", {
  userId: text("user_id").primaryKey(), mode: text("mode").notNull().default("approval"), minScore: integer("min_score").notNull().default(85),
  dailyLimit: integer("daily_limit").notNull().default(3), postingTimes: text("posting_times").notNull().default('["12:00","19:00"]'),
  platforms: text("platforms").notNull().default('["instagram","tiktok"]'), updatedAt: integer("updated_at").notNull(),
});

export const publications = sqliteTable("publications", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), clipId: text("clip_id").notNull(), platform: text("platform").notNull(),
  status: text("status").notNull().default("scheduled"), scheduledAt: integer("scheduled_at").notNull(), publishedAt: integer("published_at"),
  externalUrl: text("external_url"), error: text("error"), views: integer("views").notNull().default(0), likes: integer("likes").notNull().default(0), createdAt: integer("created_at").notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), type: text("type").notNull(), title: text("title").notNull(),
  message: text("message").notNull(), read: integer("read", { mode: "boolean" }).notNull().default(false), createdAt: integer("created_at").notNull(),
});

export const referrals = sqliteTable("referrals", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), code: text("code").notNull().unique(), clicks: integer("clicks").notNull().default(0),
  signups: integer("signups").notNull().default(0), conversions: integer("conversions").notNull().default(0), earnings: integer("earnings").notNull().default(0), createdAt: integer("created_at").notNull(),
});
