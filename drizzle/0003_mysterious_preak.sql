CREATE TABLE `browser_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`vote_at` integer DEFAULT 0 NOT NULL,
	`comment_at` integer DEFAULT 0 NOT NULL,
	`write_nonce` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `section_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`section_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "comment_length" CHECK(length("section_comments"."body") BETWEEN 1 AND 2000)
);
--> statement-breakpoint
CREATE INDEX `comments_section` ON `section_comments` (`section_id`,`id`);--> statement-breakpoint
CREATE TABLE `section_votes` (
	`section_id` text NOT NULL,
	`browser_id` text NOT NULL,
	`vote` integer NOT NULL,
	PRIMARY KEY(`section_id`, `browser_id`),
	FOREIGN KEY (`browser_id`) REFERENCES `browser_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "vote_value" CHECK("section_votes"."vote" IN (-1, 0, 1))
);
