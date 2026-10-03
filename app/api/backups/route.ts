import { saveBackup } from '@/lib/backups';
import { getDb } from '@/db';
import { isMaintainer } from '@/lib/maintenance';
import { readSnapshot } from '@/lib/snapshot-store';

// This endpoint only creates immutable snapshots. It cannot read, erase, or restore backups.
export async function POST() {
  return Response.json(await saveBackup());
}

export async function GET(request: Request) {
  if (!await isMaintainer(request)) return Response.json({ error: '仅维护者可读取备份' }, { status: 403 });
  const key = new URL(request.url).searchParams.get('key');
  if (!key) return Response.json((await getDb().prepare('SELECT * FROM backups ORDER BY created_at DESC LIMIT 100').all()).results, { headers: { 'Cache-Control': 'no-store' } });
  const snapshot = await readSnapshot(key);
  if (!snapshot) return Response.json({ error: '备份不存在' }, { status: 404 });
  return new Response(snapshot, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="sufe-wiki-backup.json"', 'Cache-Control': 'no-store' } });
}
