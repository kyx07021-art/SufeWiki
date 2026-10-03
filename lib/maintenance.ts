import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { listSections } from './wiki-store';
import { flattenTree, wikiTree, type Section } from './wiki';
import { readSnapshot, storeSnapshot } from './snapshot-store';

export async function isMaintainer(request: Request) {
  if (env.DEPLOYMENT_TARGET === 'cloudflare') {
    return !!env.MAINTENANCE_TOKEN && request.headers.get('authorization') === `Bearer ${env.MAINTENANCE_TOKEN}`;
  }
  const user = await getChatGPTUser();
  return !!user && user.email === env.ADMIN_EMAIL;
}

export async function restoreBackup(key: string) {
  const json = await readSnapshot(key);
  if (!json) return null;
  const backup = JSON.parse(json) as { format: string; sections: Section[] };
  const current = await listSections();
  const now = new Date().toISOString();
  const rescueKey = `before-restore/${now.replace(/:/g, '-')}-${crypto.randomUUID()}.json`;
  await storeSnapshot(rescueKey, current);
  const db = getDb();
  // Whole-document restore is atomic. Revision numbers increase so old drafts still conflict.
  const statements = [db.prepare('PRAGMA defer_foreign_keys = ON'),
    db.prepare(`INSERT OR IGNORE INTO revisions (section_id, revision, snapshot, saved_at)
      SELECT id, revision, json_object('id', id, 'parentId', parent_id, 'title', title, 'body', body,
      'position', position, 'revision', revision, 'updatedAt', updated_at), ? FROM sections`).bind(now),
    ...flattenTree(wikiTree(backup.sections)).map(section => db.prepare(`
      INSERT INTO sections (id, parent_id, title, body, position, revision, updated_at)
      VALUES (?, ?, ?, ?, ?, MAX(?, COALESCE((SELECT MAX(revision) FROM revisions WHERE section_id = ?), 0)) + 1, ?)
      ON CONFLICT(id) DO UPDATE SET parent_id = excluded.parent_id, title = excluded.title, body = excluded.body,
      position = excluded.position, revision = sections.revision + 1, updated_at = excluded.updated_at
    `).bind(section.id, section.parentId, section.title, section.body, section.position, section.revision, section.id, now)),
    db.prepare('DELETE FROM sections WHERE id NOT IN (SELECT value FROM json_each(?))').bind(JSON.stringify(backup.sections.map(section => section.id))),
  ];
  await db.batch(statements);
  return { restored: key, rescueKey, sectionCount: backup.sections.length };
}
