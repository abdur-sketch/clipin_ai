ALTER TABLE `clips` ADD `title_animation` text DEFAULT 'fade' NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `title_position` text DEFAULT 'top' NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `caption_position` text DEFAULT 'bottom' NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `smart_cleanup` integer DEFAULT true NOT NULL;