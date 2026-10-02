CREATE TABLE `backups` (
	`key` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`section_count` integer NOT NULL,
	`sha256` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `revisions` (
	`section_id` text NOT NULL,
	`revision` integer NOT NULL,
	`snapshot` text NOT NULL,
	`saved_at` text NOT NULL,
	PRIMARY KEY(`section_id`, `revision`)
);
--> statement-breakpoint
CREATE TABLE `sections` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`position` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "title_length" CHECK(length("sections"."title") BETWEEN 1 AND 100),
	CONSTRAINT "body_length" CHECK(length("sections"."body") <= 100000)
);
