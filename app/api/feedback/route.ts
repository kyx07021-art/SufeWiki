import { issueBrowserSession } from '@/lib/browser-session';
import { listFeedback } from '@/lib/feedback-store';

export async function GET(request: Request) {
  const { id, cookie } = await issueBrowserSession(request);
  return Response.json({ feedback: await listFeedback(id) }, { headers: { 'Cache-Control': 'no-store', 'Set-Cookie': cookie } });
}
