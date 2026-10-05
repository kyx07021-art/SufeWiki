import { sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, sqliteTable, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

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

export const snapshots = sqliteTable('wiki_snapshots', {
  key: text('key').primaryKey(),
  createdAt: text('created_at').notNull(),
  sectionCount: integer('section_count').notNull(),
  sha256: text('sha256').notNull(),
  format: text('format').notNull().default('sufe-wiki/v1'),
});

export const snapshotSections = sqliteTable('wiki_snapshot_sections', {
  key: text('snapshot_key').notNull().references(() => snapshots.key),
  ordinal: integer('ordinal').notNull(),
  section: text('section').notNull(),
}, table => [primaryKey({ columns: [table.key, table.ordinal] })]);

export const settings = sqliteTable('wiki_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const browserSessions = sqliteTable('browser_sessions', {
  id: text('id').primaryKey(),
  voteAt: integer('vote_at').notNull().default(0),
  commentAt: integer('comment_at').notNull().default(0),
  writeNonce: text('write_nonce').notNull().default(''),
});

// Feedback follows stable entry IDs, so restoring or editing the document preserves it.
export const sectionVotes = sqliteTable('section_votes', {
  sectionId: text('section_id').notNull(),
  browserId: text('browser_id').notNull().references(() => browserSessions.id),
  vote: integer('vote').notNull(),
}, table => [primaryKey({ columns: [table.sectionId, table.browserId] }), check('vote_value', sql`${table.vote} IN (-1, 0, 1)`)]);

export const sectionComments = sqliteTable('section_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sectionId: text('section_id').notNull(),
  body: text('body').notNull(),
  createdAt: text('created_at').notNull(),
  deletedAt: text('deleted_at'),
}, table => [index('comments_section').on(table.sectionId, table.id), check('comment_length', sql`length(${table.body}) BETWEEN 1 AND 2000`)]);

export const snapshotFeedback = sqliteTable('wiki_snapshot_feedback', {
  key: text('snapshot_key').notNull().references(() => snapshots.key),
  kind: text('kind').notNull(),
  ordinal: integer('ordinal').notNull(),
  record: text('record').notNull(),
}, table => [primaryKey({ columns: [table.key, table.kind, table.ordinal] })]);
