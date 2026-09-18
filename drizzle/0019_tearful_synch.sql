CREATE TABLE `oauth_states` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`platform` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `workspace_members` ADD `invite_token` text;--> statement-breakpoint
ALTER TABLE `workspace_members` ADD `expires_at` integer;