import { getDb } from '@/db';

const cookieName = 'sufe_wiki_browser';

async function browserId(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function cookieToken(request: Request) {
  return request.headers.get('cookie')?.split('; ').find(cookie => cookie.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
}

export async function getBrowserSession(request: Request) {
  const token = cookieToken(request);
  if (!token) return null;
  const id = await browserId(token);
  return await getDb().prepare('SELECT id FROM browser_sessions WHERE id = ?').bind(id).first() ? id : null;
}

export async function issueBrowserSession(request: Request) {
  let token = cookieToken(request);
  let id = await getBrowserSession(request);
  if (!id) {
    token = crypto.randomUUID();
    id = await browserId(token);
    await getDb().prepare('INSERT INTO browser_sessions (id) VALUES (?)').bind(id).run();
  }
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return { id, cookie: `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}` };
}

// Only same-origin writes with a server-issued credential can reach feedback storage.
export async function authorizeFeedback(request: Request, sectionId: string) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: '请从本站提交反馈。' }, { status: 403 });
  const id = await getBrowserSession(request);
  if (!id) return Response.json({ error: '请刷新页面，重新建立浏览器凭证。' }, { status: 401 });
  if (!await getDb().prepare('SELECT id FROM sections WHERE id = ?').bind(sectionId).first()) return Response.json({ error: '条目已被删除，请刷新页面。' }, { status: 404 });
  return id;
}
