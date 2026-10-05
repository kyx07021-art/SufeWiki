import { isMaintainer } from '@/lib/maintenance';
import { hideComment } from '@/lib/feedback-store';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isMaintainer(request)) return Response.json({ error: '仅维护者可删除评论。' }, { status: 403 });
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: '请从本站发起删除。' }, { status: 403 });
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: '评论编号无效。' }, { status: 400 });
  return await hideComment(id) ? Response.json({ deleted: id }) : Response.json({ error: '评论不存在或已删除。' }, { status: 404 });
}
