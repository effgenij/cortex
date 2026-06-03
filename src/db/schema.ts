import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ── Courses ────────────────────────────────────────────
export const courses = sqliteTable('courses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  sourceType: text('source_type').notNull().default('local'), // 'local' | 'youtube'
  sourcePath: text('source_path').notNull(),                  // fs path or URL
  language: text('language').default('ru'),
  totalModules: integer('total_modules').default(0),
  completedModules: integer('completed_modules').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// ── Modules ────────────────────────────────────────────
export const modules = sqliteTable('modules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  orderIndex: integer('order_index').notNull(),
  videoPath: text('video_path').notNull(),         // path to video file
  transcriptPath: text('transcript_path'),         // path to transcript
  summary: text('summary'),                        // AI-generated short summary
  duration: integer('duration'),                   // seconds
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ── User Progress ──────────────────────────────────────
export const userProgress = sqliteTable('user_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  moduleId: integer('module_id').references(() => modules.id, { onDelete: 'cascade' }).notNull(),
  status: text('status').notNull().default('not_started'), // 'not_started' | 'in_progress' | 'completed'
  quizScore: real('quiz_score'),                   // 0.0–1.0
  notes: text('notes'),                            // user notes
  completedAt: text('completed_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// ── Streaks ────────────────────────────────────────────
export const userStreaks = sqliteTable('user_streaks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull().unique(),            // 'YYYY-MM-DD'
  modulesCompleted: integer('modules_completed').default(0),
  minutesStudied: integer('minutes_studied').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ── Chat Threads ───────────────────────────────────────
export const chatThreads = sqliteTable('chat_threads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  moduleId: integer('module_id').references(() => modules.id, { onDelete: 'set null' }),
  title: text('title'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// ── Chat Messages ─────────────────────────────────────
export const chatMessages = sqliteTable('chat_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  threadId: integer('thread_id').references(() => chatThreads.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(),                     // 'user' | 'assistant'
  content: text('content').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ── Plugin Registry ────────────────────────────────────
export const pluginRegistry = sqliteTable('plugin_registry', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  type: text('type').notNull(),                     // 'ai' | 'source'
  manifestPath: text('manifest_path').notNull(),    // path to cortex.plugin.json
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  config: text('config', { mode: 'json' }),         // JSON config
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// ── Notes ──────────────────────────────────────────────
export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  path: text('path').notNull().unique(),           // markdown file on disk
  tags: text('tags'),                               // comma-separated
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'set null' }),
  moduleId: integer('module_id').references(() => modules.id, { onDelete: 'set null' }),
  aiSummary: text('ai_summary'),                   // AI-generated summary
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// ── Note Links (note ↔ note relationships) ─────────────
export const noteLinks = sqliteTable('note_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceNoteId: integer('source_note_id').references(() => notes.id, { onDelete: 'cascade' }).notNull(),
  targetNoteId: integer('target_note_id').references(() => notes.id, { onDelete: 'cascade' }).notNull(),
  label: text('label'),                            // e.g. 'related', 'prerequisite'
});

// ── Projects ───────────────────────────────────────────
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').default('#228be6'),          // hex color for UI
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ── Tasks ──────────────────────────────────────────────
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('todo'), // 'todo' | 'in_progress' | 'done' | 'cancelled'
  priority: integer('priority').default(2),          // 1=high, 2=medium, 3=low
  dueDate: text('due_date'),                         // 'YYYY-MM-DD'
  sourceType: text('source_type').default('manual'), // 'manual' | 'redmine' | 'reminders' | 'telegram'
  sourceId: text('source_id'),                       // external ID if imported
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'set null' }),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// ── Calendar Events ────────────────────────────────────
export const calendarEvents = sqliteTable('calendar_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  startDate: text('start_date').notNull(),           // ISO datetime
  endDate: text('end_date'),                         // ISO datetime (nullable for all-day)
  allDay: integer('all_day', { mode: 'boolean' }).default(false),
  sourceType: text('source_type').default('manual'), // 'manual' | 'google'
  sourceId: text('source_id'),                       // external event ID
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});
