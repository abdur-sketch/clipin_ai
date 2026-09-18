ALTER TABLE `clips` ADD `reframe_mode` text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `crop_focus_x` real DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `transition` text DEFAULT 'fade' NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `caption_animation` text DEFAULT 'pop' NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `audio_gain` real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `studio_preferences` ADD `templates` text DEFAULT '[]' NOT NULL;