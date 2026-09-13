import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), email: text("email").notNull().unique(),
  name: text("name").notNull(), createdAt: integer("created_at").notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), title: text("title").notNull(),
  filename: text("filename"), contentType: text("content_type"), storageKey: text("storage_key"),
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
