import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { exportMarkdown, type Section } from './wiki';

interface SnapshotMetadata {
  createdAt: string;
  sectionCount: number;
  sha256: string;
}

function snapshotJson(createdAt: string, sections: Section[]) {
  return JSON.stringify({ format: 'sufe-wiki/v1', createdAt, sections, markdown: exportMarkdown(sections) });
}

export async function storeSnapshot(key: string, sections: Section[]) {
  const createdAt = new Date().toISOString();
  const json = snapshotJson(createdAt, sections);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json));
  const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');

  if (env.DEPLOYMENT_TARGET === 'cloudflare') {
    const db = getDb();
    // The header and all sections commit together; an existing key stays immutable.
    const [insert] = await db.batch([
      db.prepare('INSERT OR IGNORE INTO wiki_snapshots (key, created_at, section_count, sha256) VALUES (?, ?, ?, ?)')
        .bind(key, createdAt, sections.length, sha256),
      ...sections.map((section, ordinal) => db.prepare(`
        INSERT OR IGNORE INTO wiki_snapshot_sections (snapshot_key, ordinal, section)
        SELECT ?, ?, ? WHERE (SELECT sha256 FROM wiki_snapshots WHERE key = ?) = ?
      `).bind(key, ordinal, JSON.stringify(section), key, sha256)),
    ]);
    const stored = (await db.prepare('SELECT created_at AS createdAt, section_count AS sectionCount, sha256 FROM wiki_snapshots WHERE key = ?')
      .bind(key).first<SnapshotMetadata>())!;
    return { ...stored, created: !!insert.meta.changes };
  }

  const object = await env.BUCKET.put(key, json, {
    onlyIf: { etagDoesNotMatch: '*' },
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: { sha256, sectionCount: String(sections.length) },
  });
  const stored = object ?? (await env.BUCKET.head(key))!;
  return {
    createdAt: stored.uploaded.toISOString(),
    sectionCount: Number(stored.customMetadata!.sectionCount),
    sha256: stored.customMetadata!.sha256,
    created: !!object,
  };
}

export async function readSnapshot(key: string): Promise<string | null> {
  if (env.DEPLOYMENT_TARGET === 'cloudflare') {
    const db = getDb();
    const header = await db.prepare('SELECT created_at AS createdAt FROM wiki_snapshots WHERE key = ?')
      .bind(key).first<{ createdAt: string }>();
    if (!header) return null;
    const { results } = await db.prepare('SELECT section FROM wiki_snapshot_sections WHERE snapshot_key = ? ORDER BY ordinal')
      .bind(key).all<{ section: string }>();
    return snapshotJson(header.createdAt, results.map(row => JSON.parse(row.section) as Section));
  }
  const object = await env.BUCKET.get(key);
  return object ? object.text() : null;
}
