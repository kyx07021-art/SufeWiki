import { cp, mkdir } from 'node:fs/promises';

await mkdir('dist/pages', { recursive: true });
await cp('hosting/pages', 'dist/pages', { recursive: true });
