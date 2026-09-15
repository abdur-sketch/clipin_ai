ALTER TABLE `clips` ADD `render_job_id` text;--> statement-breakpoint
ALTER TABLE `clips` ADD `render_progress` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `render_error` text;