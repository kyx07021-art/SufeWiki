CREATE TABLE `wiki_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO wiki_settings (key, value)
SELECT 'initialized', '1' WHERE EXISTS (SELECT 1 FROM sections);
