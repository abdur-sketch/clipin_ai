CREATE TABLE `channels` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`platform` text NOT NULL,
	`name` text NOT NULL,
	`external_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`watch_enabled` integer DEFAULT false NOT NULL,
	`last_checked_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `posting_rules` (
	`user_id` text PRIMARY KEY NOT NULL,
	`mode` text DEFAULT 'approval' NOT NULL,
	`min_score` integer DEFAULT 85 NOT NULL,
	`daily_limit` integer DEFAULT 3 NOT NULL,
	`posting_times` text DEFAULT '["12:00","19:00"]' NOT NULL,
	`platforms` text DEFAULT '["instagram","tiktok"]' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `publications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`clip_id` text NOT NULL,
	`platform` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`scheduled_at` integer NOT NULL,
	`published_at` integer,
	`external_url` text,
	`error` text,
	`views` integer DEFAULT 0 NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code` text NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`signups` integer DEFAULT 0 NOT NULL,
	`conversions` integer DEFAULT 0 NOT NULL,
	`earnings` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referrals_code_unique` ON `referrals` (`code`);--> statement-breakpoint
ALTER TABLE `projects` ADD `source_url` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `source_type` text DEFAULT 'upload' NOT NULL;