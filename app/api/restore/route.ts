import { isMaintainer, restoreBackup } from '@/lib/maintenance';

export async function POST(request: Request) {
  if (!await isMaintainer()) return Response.json({ error: '仅维护者可恢复备份' }, { status: 403 });
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: '请从本站发起恢复' }, { status: 403 });
  const { key } = await request.json() as { key: string };
  const result = await restoreBackup(key);
  return result ? Response.json(result) : Response.json({ error: '备份不存在' }, { status: 404 });
}
