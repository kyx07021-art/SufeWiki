import { getDb } from '@/db';
import type { Comment, CommentPage, EntryFeedback, Vote } from './feedback';

const feedbackQuery = `SELECT sections.id,
  COALESCE(v.likes, 0) AS likes, COALESCE(v.dislikes, 0) AS dislikes,
  COALESCE(c.comments, 0) AS comments, COALESCE(mine.vote, 0) AS vote
  FROM sections
  LEFT JOIN (SELECT section_id, SUM(vote = 1) AS likes, SUM(vote = -1) AS dislikes FROM section_votes GROUP BY section_id) v ON v.section_id = sections.id
  LEFT JOIN (SELECT section_id, COUNT(*) AS comments FROM section_comments WHERE deleted_at IS NULL GROUP BY section_id) c ON c.section_id = sections.id
  LEFT JOIN section_votes mine ON mine.section_id = sections.id AND mine.browser_id = ?`;

export async function listFeedback(browserId: string) {
  const { results } = await getDb().prepare(feedbackQuery).bind(browserId).all<EntryFeedback & { id: string }>();
  return Object.fromEntries(results.map(({ id, ...feedback }) => [id, feedback]));
}

async function entryFeedback(sectionId: string, browserId: string) {
  return (await getDb().prepare(`${feedbackQuery} WHERE sections.id = ?`).bind(browserId, sectionId).first<EntryFeedback & { id: string }>())!;
}

export async function setVote(sectionId: string, browserId: string, vote: Vote) {
  const db = getDb();
  const now = Date.now();
  const nonce = crypto.randomUUID();
  // Admission and mutation share a transaction; concurrent requests cannot bypass the interval.
  const [admission] = await db.batch([
    db.prepare('UPDATE browser_sessions SET vote_at = ?, write_nonce = ? WHERE id = ? AND vote_at <= ?').bind(now, nonce, browserId, now - 300),
    db.prepare(`INSERT INTO section_votes (section_id, browser_id, vote)
      SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM browser_sessions WHERE id = ? AND write_nonce = ?)
      ON CONFLICT(section_id, browser_id) DO UPDATE SET vote = excluded.vote`).bind(sectionId, browserId, vote, browserId, nonce),
  ]);
  return admission.meta.changes ? entryFeedback(sectionId, browserId) : null;
}

export async function listComments(sectionId: string, before: number): Promise<CommentPage> {
  const { results } = await getDb().prepare(`SELECT id, body, created_at AS createdAt FROM section_comments
    WHERE section_id = ? AND deleted_at IS NULL AND (? = 0 OR id < ?) ORDER BY id DESC LIMIT 31`)
    .bind(sectionId, before, before).all<Comment>();
  const comments = results.slice(0, 30);
  return { comments, nextCursor: results.length > 30 ? comments[29].id : null };
}

export async function createComment(sectionId: string, browserId: string, body: string) {
  const db = getDb();
  const now = Date.now();
  const nonce = crypto.randomUUID();
  const [admission, insert] = await db.batch([
    db.prepare('UPDATE browser_sessions SET comment_at = ?, write_nonce = ? WHERE id = ? AND comment_at <= ?').bind(now, nonce, browserId, now - 10000),
    db.prepare(`INSERT INTO section_comments (section_id, body, created_at)
      SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM browser_sessions WHERE id = ? AND write_nonce = ?)`)
      .bind(sectionId, body, new Date(now).toISOString(), browserId, nonce),
  ]);
  if (!admission.meta.changes) return null;
  const comment = (await db.prepare('SELECT id, body, created_at AS createdAt FROM section_comments WHERE id = ?').bind(insert.meta.last_row_id).first<Comment>())!;
  return { comment, feedback: await entryFeedback(sectionId, browserId) };
}

export async function hideComment(id: number) {
  const result = await getDb().prepare('UPDATE section_comments SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL').bind(new Date().toISOString(), id).run();
  return !!result.meta.changes;
}
