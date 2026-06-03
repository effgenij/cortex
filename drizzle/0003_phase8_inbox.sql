CREATE TABLE `inbox_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`source_type` text DEFAULT 'article' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`summary` text,
	`extracted_insights` text,
	`metadata` text,
	`created_at` text DEFAULT (datetime('now')),
	`processed_at` text
);
--> statement-breakpoint
CREATE TABLE `knowledge_extracts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inbox_item_id` integer NOT NULL,
	`content` text NOT NULL,
	`type` text DEFAULT 'insight' NOT NULL,
	`course_id` integer,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`inbox_item_id`) REFERENCES `inbox_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE set null
);
