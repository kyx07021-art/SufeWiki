import { existsSync } from 'node:fs';

if (existsSync('.env.cloudflare')) process.loadEnvFile('.env.cloudflare');
const [action, target] = process.argv.slice(2);
const origin = process.env.CF_WIKI_URL ?? 'https://sufewiki.pages.dev';
if (!['list', 'hide', 'restore'].includes(action) || !target) throw new Error('用法：npm run comments -- list <词条ID> | hide <评论ID> | restore <评论ID>');
if (action !== 'list' && !process.env.MAINTENANCE_TOKEN) throw new Error('请在 .env.cloudflare 配置 MAINTENANCE_TOKEN。');

const response = await fetch(action === 'list' ? `${origin}/api/sections/${encodeURIComponent(target)}/comments` : `${origin}/api/comments/${encodeURIComponent(target)}`, {
  method: action === 'list' ? 'GET' : action === 'hide' ? 'DELETE' : 'PATCH',
  headers: action === 'list' ? {} : { Origin: origin, Authorization: `Bearer ${process.env.MAINTENANCE_TOKEN}` },
});
const result = await response.json();
if (!response.ok) throw new Error(result.error);
console.log(JSON.stringify(result, null, 2));
