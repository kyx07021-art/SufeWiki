import { sql } from 'drizzle-orm';
import { check, integer, primaryKey, sqliteTable, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

export const sections = sqliteTable('sections', {
  id: text('id').primaryKey(),
  parentId: text('parent_id').references((): AnySQLiteColumn => sections.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  position: integer('position').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
}, table => [check('title_length', sql`length(${table.title}) BETWEEN 1 AND 100`), check('body_length', sql`length(${table.body}) <= 100000`)]);

export const revisions = sqliteTable('revisions', {
  sectionId: text('section_id').notNull(),
  revision: integer('revision').notNull(),
  snapshot: text('snapshot').notNull(),
  savedAt: text('saved_at').notNull(),
}, table => [primaryKey({ columns: [table.sectionId, table.revision] })]);

export const backups = sqliteTable('backups', {
  key: text('key').primaryKey(),
  createdAt: text('created_at').notNull(),
  sectionCount: integer('section_count').notNull(),
  sha256: text('sha256').notNull(),
});
