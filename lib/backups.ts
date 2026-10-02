import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { listSections } from './wiki-store';
import { exportMarkdown } from './wiki';

export async function saveBackup() {
  const now = new Date();
  const slot = new Date(Math.floor(now.getTime() / (4 * 60 * 60 * 1000)) * 4 * 60 * 60 * 1000);
  const key = `wiki/${slot.toISOString().replace(/:/g, '-')}.json`;
  const sections = await listSections();
  const json = JSON.stringify({ format: 'sufe-wiki/v1', createdAt: now.toISOString(), sections, markdown: exportMarkdown(sections) });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json));
  const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  // Each four-hour slot is immutable, including when a scheduler retries.
  const object = await env.BUCKET.put(key, json, {
    onlyIf: { etagDoesNotMatch: '*' },
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: { sha256, sectionCount: String(sections.length) },
  });
  const stored = object ?? (await env.BUCKET.head(key))!;
  const storedHash = stored.customMetadata!.sha256;
  await getDb().prepare('INSERT OR IGNORE INTO backups (key, created_at, section_count, sha256) VALUES (?, ?, ?, ?)')
    .bind(key, stored.uploaded.toISOString(), Number(stored.customMetadata!.sectionCount), storedHash).run();
  return { key, sha256: storedHash, created: !!object };
}
