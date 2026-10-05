'use client';

import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { MessageSquare, ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { emptyFeedback, type Comment, type CommentPage, type EntryFeedback as Feedback, type Vote } from '@/lib/feedback';

async function feedbackRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const result = await response.json() as T & { error: string };
  if (!response.ok) throw new Error(result.error);
  return result;
}

const FeedbackContext = createContext<{
  entries: Record<string, Feedback>;
  ready: boolean;
  update: (id: string, feedback: Feedback) => void;
} | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Record<string, Feedback>>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    feedbackRequest<{ feedback: Record<string, Feedback> }>('/api/feedback')
      .then(result => { setEntries(result.feedback); setReady(true); })
      .catch(() => toast.error('反馈加载失败，请刷新页面。'));
  }, []);
  return <FeedbackContext.Provider value={{ entries, ready, update: (id, feedback) => setEntries(current => ({ ...current, [id]: feedback })) }}>{children}</FeedbackContext.Provider>;
}

function CommentItem({ comment }: { comment: Comment }) {
  return <li><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</time><p>{comment.body}</p></li>;
}

export function EntryFeedback({ id, title }: { id: string; title: string }) {
  const { entries, ready, update } = useContext(FeedbackContext)!;
  const feedback = entries[id] ?? emptyFeedback;
  const [voting, setVoting] = useState(false);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<CommentPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelId = `comments-${id}`;

  async function vote(value: Vote) {
    setVoting(true);
    try {
      const result = await feedbackRequest<{ feedback: Feedback }>(`/api/sections/${id}/vote`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vote: feedback.vote === value ? 0 : value }),
      });
      update(id, result.feedback);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setVoting(false);
    }
  }

  async function loadComments(before = 0) {
    setLoading(true); setError(null);
    try {
      const result = await feedbackRequest<CommentPage>(`/api/sections/${id}/comments?before=${before}`);
      setPage(current => before ? { ...result, comments: [...current!.comments, ...result.comments] } : result);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function toggleComments() {
    setOpen(!open);
    if (!open) void loadComments();
  }

  async function publish(event: FormEvent) {
    event.preventDefault(); setPublishing(true); setError(null);
    try {
      const result = await feedbackRequest<{ comment: Comment; feedback: Feedback }>(`/api/sections/${id}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }),
      });
      setPage(current => ({ ...current!, comments: [result.comment, ...current!.comments] }));
      update(id, result.feedback); setBody('');
      toast.success('评论已发布');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  return <div className="entry-feedback">
    <div className="feedback-bar" aria-label={`${title}的读者反馈`} aria-busy={!ready || voting}>
      <button type="button" aria-label={`点赞${title}，${feedback.likes}票`} aria-pressed={feedback.vote === 1} disabled={!ready || voting} onClick={() => void vote(1)}><ThumbsUp size={14} aria-hidden="true" /><span>点赞</span><span>{ready ? feedback.likes : '—'}</span></button>
      <button type="button" aria-label={`点踩${title}，${feedback.dislikes}票`} aria-pressed={feedback.vote === -1} disabled={!ready || voting} onClick={() => void vote(-1)}><ThumbsDown size={14} aria-hidden="true" /><span>点踩</span><span>{ready ? feedback.dislikes : '—'}</span></button>
      <button type="button" aria-label={`${title}的评论，${feedback.comments}条`} aria-expanded={open} aria-controls={panelId} disabled={!ready} onClick={toggleComments}><MessageSquare size={14} aria-hidden="true" /><span>评论</span><span>{ready ? feedback.comments : '—'}</span></button>
    </div>
    {open && <div className="comments-panel" id={panelId} role="region" aria-label={`${title}的评论`}>
      {loading && <p className="comments-status" role="status">正在加载评论…</p>}
      {page && <>{page.comments.length ? <ol className="comment-list">{page.comments.map(comment => <CommentItem key={comment.id} comment={comment} />)}</ol> : !loading && <p className="comments-status">暂无评论，欢迎补充信息或提出意见。</p>}
        {page.nextCursor !== null && <button className="comments-more" disabled={loading} onClick={() => void loadComments(page.nextCursor!)}>查看更早的评论</button>}</>}
      {error && <p className="comment-error" role="alert">{error}</p>}
      {!page && !loading && <button className="comments-more" onClick={() => void loadComments()}>重新加载</button>}
      <form className="comment-form" onSubmit={publish}>
        <label htmlFor={`comment-body-${id}`}>发表评论</label>
        <textarea id={`comment-body-${id}`} value={body} onChange={event => setBody(event.target.value)} placeholder="补充信息或说明你的看法…" maxLength={2000} rows={3} required />
        <div><span>匿名发布，内容公开。</span><button className="primary-button" disabled={!page || loading || publishing || !body.trim()}>{publishing ? '正在发布…' : '匿名发布'}</button></div>
      </form>
    </div>}
  </div>;
}
