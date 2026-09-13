ALTER TABLE `clips` ADD `aspect_ratio` text DEFAULT '9:16' NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `font_size` integer DEFAULT 48 NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `watermark` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `logo_key` text;