import seed from '@/content/seed.json';
import { getDb } from '@/db';
import { normalizeMarkdown, type Section } from './wiki';

const columns = 'id, parent_id AS parentId, title, body, position, revision, updated_at AS updatedAt';

export async function listSections(): Promise<Section[]> {
  const db = getDb();
  const { results } = await db.prepare(`SELECT ${columns} FROM sections ORDER BY position`).all<Section>();
  if (results.length) return results;
  // Seed only an empty database. Redeployments never replace live contributions.
  await db.batch(seed.map(section => db.prepare(
    'INSERT OR IGNORE INTO sections (id, parent_id, title, body, position, revision, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(section.id, section.parentId, section.title, section.body, section.position, section.revision, section.updatedAt)));
  return (await db.prepare(`SELECT ${columns} FROM sections ORDER BY position`).all<Section>()).results;
}

export interface EditSection { title: string; body: string; revision: number }

export async function editSection(id: string, input: EditSection): Promise<Section | null> {
  const db = getDb();
  const now = new Date().toISOString();
  // The old revision and the update share one transaction; stale editors cannot overwrite newer work.
  const [, update] = await db.batch([
    db.prepare(`INSERT OR IGNORE INTO revisions (section_id, revision, snapshot, saved_at)
      SELECT id, revision, json_object('id', id, 'parentId', parent_id, 'title', title, 'body', body,
      'position', position, 'revision', revision, 'updatedAt', updated_at), ? FROM sections WHERE id = ? AND revision = ?`).bind(now, id, input.revision),
    db.prepare(`UPDATE sections SET title = ?, body = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?`)
      .bind(input.title.trim(), normalizeMarkdown(input.body), now, id, input.revision),
  ]);
  if (!update.meta.changes) return null;
  return db.prepare(`SELECT ${columns} FROM sections WHERE id = ?`).bind(id).first<Section>();
}

export async function createSection(input: { parentId: string | null; title: string; body: string }): Promise<Section> {
  const db = getDb();
  const id = crypto.randomUUID();
  await db.prepare(`INSERT INTO sections (id, parent_id, title, body, position, revision, updated_at)
    VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM sections), 1, ?)`)
    .bind(id, input.parentId, input.title.trim(), normalizeMarkdown(input.body), new Date().toISOString()).run();
  return (await db.prepare(`SELECT ${columns} FROM sections WHERE id = ?`).bind(id).first<Section>())!;
}
