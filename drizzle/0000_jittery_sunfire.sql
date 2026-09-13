CREATE TABLE `clips` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`start_time` real NOT NULL,
	`end_time` real NOT NULL,
	`score` integer NOT NULL,
	`title` text NOT NULL,
	`hook` text NOT NULL,
	`caption` text NOT NULL,
	`subtitles` text DEFAULT '[]' NOT NULL,
	`style` text DEFAULT 'bold' NOT NULL,
	`face_tracking` integer DEFAULT true NOT NULL,
	`hook_overlay` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`rendered_key` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`filename` text,
	`content_type` text,
	`storage_key` text,
	`duration` real DEFAULT 0 NOT NULL,
	`language` text DEFAULT 'id' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transcripts` (
	`project_id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`segments` text DEFAULT '[]' NOT NULL,
	`provider` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);