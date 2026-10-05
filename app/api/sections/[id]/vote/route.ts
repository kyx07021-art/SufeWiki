import { z } from 'zod';
import { authorizeFeedback } from '@/lib/browser-session';
import { setVote } from '@/lib/feedback-store';

const inputSchema = z.object({ vote: z.union([z.literal(-1), z.literal(0), z.literal(1)]) });

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const browserId = await authorizeFeedback(request, id);
  if (browserId instanceof Response) return browserId;
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: '请选择点赞、点踩或取消。' }, { status: 400 });
  const feedback = await setVote(id, browserId, input.data.vote);
  return feedback ? Response.json({ feedback }) : Response.json({ error: '操作太快，请稍后再试。' }, { status: 429 });
}
