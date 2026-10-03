import { getDb } from '@/db';
import { listSections } from './wiki-store';
import { storeSnapshot } from './snapshot-store';

export async function saveBackup() {
  const now = new Date();
  const slot = new Date(Math.floor(now.getTime() / (4 * 60 * 60 * 1000)) * 4 * 60 * 60 * 1000);
  const key = `wiki/${slot.toISOString().replace(/:/g, '-')}.json`;
  const sections = await listSections();
  // Each four-hour slot is immutable, including when a scheduler retries.
  const stored = await storeSnapshot(key, sections);
  await getDb().prepare('INSERT OR IGNORE INTO backups (key, created_at, section_count, sha256) VALUES (?, ?, ?, ?)')
    .bind(key, stored.createdAt, stored.sectionCount, stored.sha256).run();
  return { key, sha256: stored.sha256, created: stored.created };
}
