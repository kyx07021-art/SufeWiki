import seed from '@/content/seed.json';
import { getDb } from '@/db';
import { normalizeMarkdown, type Section } from './wiki';
import { storeSnapshot } from './snapshot-store';

const columns = 'id, parent_id AS parentId, title, body, position, revision, updated_at AS updatedAt';

export async function listSections(): Promise<Section[]> {
  const db = getDb();
  const { results } = await db.prepare(`SELECT ${columns} FROM sections ORDER BY position`).all<Section>();
  if (results.length || await db.prepare("SELECT value FROM wiki_settings WHERE key = 'initialized'").first()) return results;
  // Initialization is recorded separately, so deleting the last entry stays deleted.
  await db.batch([...seed.map(section => db.prepare(
    'INSERT OR IGNORE INTO sections (id, parent_id, title, body, position, revision, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(section.id, section.parentId, section.title, section.body, section.position, section.revision, section.updatedAt)),
    db.prepare("INSERT OR IGNORE INTO wiki_settings (key, value) VALUES ('initialized', '1')"),
  ]);
  return (await db.prepare(`SELECT ${columns} FROM sections ORDER BY position`).all<Section>()).results;
}

export type DeleteMode = 'entry' | 'subtree';

export async function deleteSection(id: string, input: { revision: number; mode: DeleteMode }) {
  const db = getDb();
  const current = await listSections();
  const now = new Date().toISOString();
  const rescueKey = `before-delete/${now.replace(/:/g, '-')}-${crypto.randomUUID()}.json`;
  const stored = await storeSnapshot(rescueKey, current);
  await db.prepare('INSERT INTO backups (key, created_at, section_count, sha256) VALUES (?, ?, ?, ?)')
    .bind(rescueKey, stored.createdAt, stored.sectionCount, stored.sha256).run();
  const descendants = `WITH RECURSIVE branch(id) AS (
    SELECT id FROM sections WHERE id = ? AND revision = ?
    UNION ALL SELECT sections.id FROM sections JOIN branch ON sections.parent_id = branch.id
  )`;
  const affected = input.mode === 'subtree'
    ? `${descendants} SELECT id FROM branch`
    : 'SELECT id FROM sections WHERE (id = ? OR parent_id = ?) AND EXISTS (SELECT 1 FROM sections WHERE id = ? AND revision = ?)';
  const affectedArgs = input.mode === 'subtree' ? [id, input.revision] : [id, id, id, input.revision];
  const statements = [db.prepare(`INSERT OR IGNORE INTO revisions (section_id, revision, snapshot, saved_at)
    SELECT id, revision, json_object('id', id, 'parentId', parent_id, 'title', title, 'body', body,
    'position', position, 'revision', revision, 'updatedAt', updated_at), ?
    FROM sections WHERE id IN (${affected})`).bind(now, ...affectedArgs)];
  if (input.mode === 'entry') {
    statements.push(db.prepare(`UPDATE sections SET parent_id = (SELECT parent_id FROM sections WHERE id = ?),
      revision = revision + 1, updated_at = ? WHERE parent_id = ?
      AND EXISTS (SELECT 1 FROM sections WHERE id = ? AND revision = ?)`)
      .bind(id, now, id, id, input.revision));
  }
  statements.push(input.mode === 'subtree'
    ? db.prepare(`${descendants} DELETE FROM sections WHERE id IN (SELECT id FROM branch)`).bind(id, input.revision)
    : db.prepare('DELETE FROM sections WHERE id = ? AND revision = ?').bind(id, input.revision));
  const changes = await db.batch(statements);
  const deletedCount = changes[changes.length - 1].meta.changes;
  return deletedCount ? { sections: await listSections(), deletedCount, rescueKey } : null;
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
