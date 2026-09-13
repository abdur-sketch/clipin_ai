CREATE TABLE `campaign_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'joined' NOT NULL,
	`joined_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `campaign_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`user_id` text NOT NULL,
	`clip_id` text,
	`platform` text NOT NULL,
	`content_url` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`earnings` integer DEFAULT 0 NOT NULL,
	`rejection_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`title` text NOT NULL,
	`brand_name` text NOT NULL,
	`category` text NOT NULL,
	`content_type` text NOT NULL,
	`description` text NOT NULL,
	`platforms` text DEFAULT '[]' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`brief_url` text,
	`asset_url` text,
	`payment_type` text DEFAULT 'per_video' NOT NULL,
	`rate` integer NOT NULL,
	`total_budget` integer NOT NULL,
	`spent_budget` integer DEFAULT 0 NOT NULL,
	`min_views` integer DEFAULT 0 NOT NULL,
	`max_views` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`deadline` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payout_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text NOT NULL,
	`account` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
