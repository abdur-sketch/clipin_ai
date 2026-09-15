ALTER TABLE `clips` ADD `transcript_cut` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `audio_preset` text DEFAULT 'podcast' NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `speaker_colors` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `broll_key` text;--> statement-breakpoint
ALTER TABLE `clips` ADD `broll_start` real DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `thumbnail_key` text;