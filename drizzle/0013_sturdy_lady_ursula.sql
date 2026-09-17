CREATE TABLE `studio_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`brand_kit` text DEFAULT '{}' NOT NULL,
	`drafts` text DEFAULT '{}' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `clips` ADD `noise_reduction` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `auto_level` integer DEFAULT true NOT NULL;