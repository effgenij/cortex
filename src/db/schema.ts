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
