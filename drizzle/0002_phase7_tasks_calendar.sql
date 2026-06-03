CREATE TABLE `calendar_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_date` text NOT NULL,
	`end_date` text,
	`all_day` integer DEFAULT false,
	`source_type` text DEFAULT 'manual',
	`source_id` text,
	`task_id` integer,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#228be6',
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`priority` integer DEFAULT 2,
	`due_date` text,
	`source_type` text DEFAULT 'manual',
	`source_id` text,
	`project_id` integer,
	`course_id` integer,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE set null
);
