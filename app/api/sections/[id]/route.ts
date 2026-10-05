import { deleteSection, editSection } from '@/lib/wiki-store';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const section = await editSection(id, await request.json());
  if (!section) return Response.json({ error: '这段内容已被其他同学更新。请对照最新版本合并后重新发布。' }, { status: 409 });
  return Response.json({ section });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await deleteSection(id, await request.json());
  if (!result) return Response.json({ error: '此条目已被更新或删除。请刷新后再操作。' }, { status: 409 });
  return Response.json(result);
}
