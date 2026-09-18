import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  filename: text("filename"),
  contentType: text("content_type"),
  storageKey: text("storage_key"),
  sourceUrl: text("source_url"),
  sourceType: text("source_type").notNull().default("upload"),
  duration: real("duration").notNull().default(0),
  language: text("language").notNull().default("id"),
  targetDuration: integer("target_duration").notNull().default(30),
  contentStyle: text("content_style").notNull().default("viral"),
  status: text("status").notNull().default("draft"),
  progress: integer("progress").notNull().default(0),
  error: text("error"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const clips = sqliteTable("clips", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  startTime: real("start_time").notNull(),
  endTime: real("end_time").notNull(),
  score: integer("score").notNull(),
  title: text("title").notNull(),
  hook: text("hook").notNull(),
  caption: text("caption").notNull(),
  subtitles: text("subtitles").notNull().default("[]"),
  reason: text("reason"),
  category: text("category"),
  style: text("style").notNull().default("bold"),
  faceTracking: integer("face_tracking", { mode: "boolean" })
    .notNull()
    .default(true),
  hookOverlay: integer("hook_overlay", { mode: "boolean" })
    .notNull()
    .default(true),
  aspectRatio: text("aspect_ratio").notNull().default("9:16"),
  captionsEnabled: integer("captions_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  fontSize: integer("font_size").notNull().default(48),
  fontFamily: text("font_family").notNull().default("system"),
  fontColor: text("font_color").notNull().default("#FFFFFF"),
  fontEffect: text("font_effect").notNull().default("outline"),
  titleEffect: text("title_effect").notNull().default("background"),
  titleAnimation: text("title_animation").notNull().default("fade"),
  titlePosition: text("title_position").notNull().default("top"),
  captionPosition: text("caption_position").notNull().default("bottom"),
  smartCleanup: integer("smart_cleanup", { mode: "boolean" })
    .notNull()
    .default(true),
  transcriptCut: integer("transcript_cut", { mode: "boolean" })
    .notNull()
    .default(false),
  audioPreset: text("audio_preset").notNull().default("podcast"),
  noiseReduction: integer("noise_reduction", { mode: "boolean" })
    .notNull()
    .default(true),
  autoLevel: integer("auto_level", { mode: "boolean" })
    .notNull()
    .default(true),
  speakerColors: integer("speaker_colors", { mode: "boolean" })
    .notNull()
    .default(false),
  reframeMode: text("reframe_mode").notNull().default("auto"),
  cropFocusX: real("crop_focus_x").notNull().default(0.5),
  transition: text("transition").notNull().default("fade"),
  captionAnimation: text("caption_animation").notNull().default("pop"),
  audioGain: real("audio_gain").notNull().default(1),
  exportResolution: text("export_resolution").notNull().default("1080p"),
  exportFps: integer("export_fps").notNull().default(30),
  exportBitrate: integer("export_bitrate").notNull().default(5),
  musicKey: text("music_key"),
  musicVolume: real("music_volume").notNull().default(0.18),
  audioDucking: integer("audio_ducking", { mode: "boolean" })
    .notNull()
    .default(true),
  brollKey: text("broll_key"),
  brollStart: real("broll_start").notNull().default(2),
  thumbnailKey: text("thumbnail_key"),
  watermark: integer("watermark", { mode: "boolean" }).notNull().default(true),
  logoKey: text("logo_key"),
  status: text("status").notNull().default("ready"),
  renderJobId: text("render_job_id"),
  renderProgress: integer("render_progress").notNull().default(0),
  renderError: text("render_error"),
  postCaption: text("post_caption"),
  postCta: text("post_cta"),
  postHashtags: text("post_hashtags").notNull().default("[]"),
  renderedKey: text("rendered_key"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const transcripts = sqliteTable("transcripts", {
  projectId: text("project_id").primaryKey(),
  text: text("text").notNull(),
  segments: text("segments").notNull().default("[]"),
  provider: text("provider").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const channels = sqliteTable("channels", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  platform: text("platform").notNull(),
  name: text("name").notNull(),
  externalId: text("external_id"),
  status: text("status").notNull().default("pending"),
  watchEnabled: integer("watch_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  lastCheckedAt: integer("last_checked_at"),
  createdAt: integer("created_at").notNull(),
});

export const postingRules = sqliteTable("posting_rules", {
  userId: text("user_id").primaryKey(),
  mode: text("mode").notNull().default("approval"),
  minScore: integer("min_score").notNull().default(85),
  dailyLimit: integer("daily_limit").notNull().default(3),
  postingTimes: text("posting_times").notNull().default('["12:00","19:00"]'),
  platforms: text("platforms").notNull().default('["instagram","tiktok"]'),
  updatedAt: integer("updated_at").notNull(),
});

export const publications = sqliteTable("publications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  clipId: text("clip_id").notNull(),
  platform: text("platform").notNull(),
  status: text("status").notNull().default("scheduled"),
  scheduledAt: integer("scheduled_at").notNull(),
  publishedAt: integer("published_at"),
  externalUrl: text("external_url"),
  error: text("error"),
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  followersGained: integer("followers_gained").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const revenueEntries = sqliteTable("revenue_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  source: text("source").notNull(),
  platform: text("platform"),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  earnedAt: integer("earned_at").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
});

export const referrals = sqliteTable("referrals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  code: text("code").notNull().unique(),
  clicks: integer("clicks").notNull().default(0),
  signups: integer("signups").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  earnings: integer("earnings").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id").primaryKey(),
  language: text("language").notNull().default("id"),
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  subtitleStyle: text("subtitle_style").notNull().default("bold"),
  emailNotifications: integer("email_notifications", { mode: "boolean" })
    .notNull()
    .default(true),
  processingNotifications: integer("processing_notifications", {
    mode: "boolean",
  })
    .notNull()
    .default(true),
  publishNotifications: integer("publish_notifications", { mode: "boolean" })
    .notNull()
    .default(true),
  retentionDays: integer("retention_days").notNull().default(30),
  highContrast: integer("high_contrast", { mode: "boolean" })
    .notNull()
    .default(false),
  reducedMotion: integer("reduced_motion", { mode: "boolean" })
    .notNull()
    .default(false),
  automaticBackup: integer("automatic_backup", { mode: "boolean" })
    .notNull()
    .default(true),
  updatedAt: integer("updated_at").notNull(),
});

export const uploadSessions = sqliteTable("upload_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  projectId: text("project_id").notNull(),
  storageKey: text("storage_key").notNull(),
  uploadId: text("upload_id").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  completedParts: text("completed_parts").notNull().default("[]"),
  status: text("status").notNull().default("uploading"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("info"),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
});

export const workspaceBackups = sqliteTable("workspace_backups", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  snapshot: text("snapshot").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const workspaceMembers = sqliteTable("workspace_members", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("reviewer"),
  status: text("status").notNull().default("invited"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const studioPreferences = sqliteTable("studio_preferences", {
  userId: text("user_id").primaryKey(),
  brandKit: text("brand_kit").notNull().default("{}"),
  drafts: text("drafts").notNull().default("{}"),
  templates: text("templates").notNull().default("[]"),
  brandVoice: text("brand_voice").notNull().default("{}"),
  updatedAt: integer("updated_at").notNull(),
});

export const clipVersions = sqliteTable("clip_versions", {
  id: text("id").primaryKey(),
  clipId: text("clip_id").notNull(),
  userId: text("user_id").notNull(),
  label: text("label").notNull(),
  snapshot: text("snapshot").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const reviewComments = sqliteTable("review_comments", {
  id: text("id").primaryKey(),
  clipId: text("clip_id").notNull(),
  userId: text("user_id").notNull(),
  author: text("author").notNull(),
  message: text("message").notNull(),
  timestamp: real("timestamp").notNull().default(0),
  status: text("status").notNull().default("comment"),
  createdAt: integer("created_at").notNull(),
});

export const subscriptions = sqliteTable("subscriptions", {
  userId: text("user_id").primaryKey(),
  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  minutesLimit: integer("minutes_limit").notNull().default(15),
  minutesUsed: integer("minutes_used").notNull().default(8),
  trialEndsAt: integer("trial_ends_at"),
  currentPeriodEndsAt: integer("current_period_ends_at"),
  updatedAt: integer("updated_at").notNull(),
});

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  title: text("title").notNull(),
  brandName: text("brand_name").notNull(),
  category: text("category").notNull(),
  contentType: text("content_type").notNull(),
  description: text("description").notNull(),
  platforms: text("platforms").notNull().default("[]"),
  tags: text("tags").notNull().default("[]"),
  briefUrl: text("brief_url"),
  assetUrl: text("asset_url"),
  paymentType: text("payment_type").notNull().default("per_video"),
  rate: integer("rate").notNull(),
  totalBudget: integer("total_budget").notNull(),
  spentBudget: integer("spent_budget").notNull().default(0),
  minViews: integer("min_views").notNull().default(0),
  maxViews: integer("max_views").notNull().default(0),
  status: text("status").notNull().default("open"),
  deadline: integer("deadline"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const campaignParticipants = sqliteTable("campaign_participants", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull(),
  userId: text("user_id").notNull(),
  status: text("status").notNull().default("joined"),
  joinedAt: integer("joined_at").notNull(),
});

export const campaignSubmissions = sqliteTable("campaign_submissions", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull(),
  userId: text("user_id").notNull(),
  clipId: text("clip_id"),
  platform: text("platform").notNull(),
  contentUrl: text("content_url").notNull(),
  status: text("status").notNull().default("pending"),
  views: integer("views").notNull().default(0),
  earnings: integer("earnings").notNull().default(0),
  rejectionReason: text("rejection_reason"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const payoutRequests = sqliteTable("payout_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  amount: integer("amount").notNull(),
  method: text("method").notNull(),
  account: text("account").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
