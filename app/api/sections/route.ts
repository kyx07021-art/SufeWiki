import { createSection, listSections } from '@/lib/wiki-store';

export async function GET() {
  return Response.json({ sections: await listSections() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const section = await createSection(await request.json());
  return Response.json({ section }, { status: 201 });
}
