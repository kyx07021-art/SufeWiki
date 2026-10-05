import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { exportMarkdown, type Section } from './wiki';
import { feedbackSnapshot, type FeedbackSnapshot } from './feedback-store';

interface SnapshotMetadata {
  createdAt: string;
  sectionCount: number;
  sha256: string;
}

function snapshotJson(createdAt: string, sections: Section[], feedback?: FeedbackSnapshot) {
  return JSON.stringify({ format: feedback ? 'sufe-wiki/v2' : 'sufe-wiki/v1', createdAt, sections, markdown: exportMarkdown(sections), ...(feedback && { feedback }) });
}

export async function storeSnapshot(key: string, sections: Section[]) {
  const createdAt = new Date().toISOString();
  const feedback = await feedbackSnapshot();
  const json = snapshotJson(createdAt, sections, feedback);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json));
  const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');

  if (env.DEPLOYMENT_TARGET === 'cloudflare') {
    const db = getDb();
    // The header and all sections commit together; an existing key stays immutable.
    const [insert] = await db.batch([
      db.prepare("INSERT OR IGNORE INTO wiki_snapshots (key, created_at, section_count, sha256, format) VALUES (?, ?, ?, ?, 'sufe-wiki/v2')")
        .bind(key, createdAt, sections.length, sha256),
      ...sections.map((section, ordinal) => db.prepare(`
        INSERT OR IGNORE INTO wiki_snapshot_sections (snapshot_key, ordinal, section)
        SELECT ?, ?, ? WHERE (SELECT sha256 FROM wiki_snapshots WHERE key = ?) = ?
      `).bind(key, ordinal, JSON.stringify(section), key, sha256)),
      ...(['votes', 'comments'] as const).flatMap(kind => feedback[kind].map((record, ordinal) => db.prepare(`
        INSERT OR IGNORE INTO wiki_snapshot_feedback (snapshot_key, kind, ordinal, record)
        SELECT ?, ?, ?, ? WHERE (SELECT sha256 FROM wiki_snapshots WHERE key = ?) = ?
      `).bind(key, kind, ordinal, JSON.stringify(record), key, sha256))),
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
    const header = await db.prepare('SELECT created_at AS createdAt, format FROM wiki_snapshots WHERE key = ?')
      .bind(key).first<{ createdAt: string; format: string }>();
    if (!header) return null;
    const { results } = await db.prepare('SELECT section FROM wiki_snapshot_sections WHERE snapshot_key = ? ORDER BY ordinal')
      .bind(key).all<{ section: string }>();
    let feedback: FeedbackSnapshot | undefined;
    if (header.format === 'sufe-wiki/v2') {
      const { results: records } = await db.prepare('SELECT kind, record FROM wiki_snapshot_feedback WHERE snapshot_key = ? ORDER BY kind, ordinal')
        .bind(key).all<{ kind: string; record: string }>();
      feedback = {
        votes: records.filter(row => row.kind === 'votes').map(row => JSON.parse(row.record)),
        comments: records.filter(row => row.kind === 'comments').map(row => JSON.parse(row.record)),
      };
    }
    return snapshotJson(header.createdAt, results.map(row => JSON.parse(row.section) as Section), feedback);
  }
  const object = await env.BUCKET.get(key);
  return object ? object.text() : null;
}
