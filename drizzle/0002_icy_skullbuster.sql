CREATE TABLE `subscriptions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`billing_cycle` text DEFAULT 'monthly' NOT NULL,
	`minutes_limit` integer DEFAULT 15 NOT NULL,
	`minutes_used` integer DEFAULT 8 NOT NULL,
	`trial_ends_at` integer,
	`current_period_ends_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`language` text DEFAULT 'id' NOT NULL,
	`timezone` text DEFAULT 'Asia/Jakarta' NOT NULL,
	`subtitle_style` text DEFAULT 'bold' NOT NULL,
	`email_notifications` integer DEFAULT true NOT NULL,
	`processing_notifications` integer DEFAULT true NOT NULL,
	`publish_notifications` integer DEFAULT true NOT NULL,
	`updated_at` integer NOT NULL
);
