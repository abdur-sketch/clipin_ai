CREATE TABLE `revenue_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`platform` text,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`earned_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `clips` ADD `post_caption` text;--> statement-breakpoint
ALTER TABLE `clips` ADD `post_cta` text;--> statement-breakpoint
ALTER TABLE `clips` ADD `post_hashtags` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `publications` ADD `comments` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `publications` ADD `shares` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `publications` ADD `followers_gained` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `publications` ADD `updated_at` integer DEFAULT 0 NOT NULL;
