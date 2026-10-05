import { z } from 'zod';
import { getDb } from '@/db';
import { authorizeFeedback } from '@/lib/browser-session';
import { createComment, listComments } from '@/lib/feedback-store';

const inputSchema = z.object({ body: z.string().trim().min(1).max(2000) });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const before = Number(new URL(request.url).searchParams.get('before') ?? 0);
  if (!Number.isSafeInteger(before) || before < 0) return Response.json({ error: '评论页码无效。' }, { status: 400 });
  if (!await getDb().prepare('SELECT id FROM sections WHERE id = ?').bind(id).first()) return Response.json({ error: '条目已被删除。' }, { status: 404 });
  return Response.json(await listComments(id, before), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const browserId = await authorizeFeedback(request, id);
  if (browserId instanceof Response) return browserId;
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: '评论需为 1 至 2000 字。' }, { status: 400 });
  const result = await createComment(id, browserId, input.data.body);
  return result ? Response.json(result, { status: 201 }) : Response.json({ error: '请间隔 10 秒再发布下一条评论。' }, { status: 429 });
}
