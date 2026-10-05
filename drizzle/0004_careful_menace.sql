CREATE TABLE `wiki_snapshot_feedback` (
	`snapshot_key` text NOT NULL,
	`kind` text NOT NULL,
	`ordinal` integer NOT NULL,
	`record` text NOT NULL,
	PRIMARY KEY(`snapshot_key`, `kind`, `ordinal`),
	FOREIGN KEY (`snapshot_key`) REFERENCES `wiki_snapshots`(`key`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `wiki_snapshots` ADD `format` text DEFAULT 'sufe-wiki/v1' NOT NULL;