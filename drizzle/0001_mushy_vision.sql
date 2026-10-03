CREATE TABLE `wiki_snapshot_sections` (
	`snapshot_key` text NOT NULL,
	`ordinal` integer NOT NULL,
	`section` text NOT NULL,
	PRIMARY KEY(`snapshot_key`, `ordinal`),
	FOREIGN KEY (`snapshot_key`) REFERENCES `wiki_snapshots`(`key`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `wiki_snapshots` (
	`key` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`section_count` integer NOT NULL,
	`sha256` text NOT NULL
);
