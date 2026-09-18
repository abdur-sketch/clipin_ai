CREATE TABLE `clip_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`clip_id` text NOT NULL,
	`user_id` text NOT NULL,
	`label` text NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `review_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`clip_id` text NOT NULL,
	`user_id` text NOT NULL,
	`author` text NOT NULL,
	`message` text NOT NULL,
	`timestamp` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'comment' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `clips` ADD `export_resolution` text DEFAULT '1080p' NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `export_fps` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `export_bitrate` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `music_key` text;--> statement-breakpoint
ALTER TABLE `clips` ADD `music_volume` real DEFAULT 0.18 NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `audio_ducking` integer DEFAULT true NOT NULL;