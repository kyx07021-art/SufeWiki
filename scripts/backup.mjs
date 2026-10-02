// Read private Site service access from stdin; never write credentials to files or logs.
let input = '';
for await (const chunk of process.stdin) input += chunk;
const { origin, token } = JSON.parse(input);
const response = await fetch(new URL('/api/backups', origin), {
  method: 'POST', headers: token ? { 'OAI-Sites-Authorization': `Bearer ${token}` } : {},
});
if (!response.ok) throw new Error(`Backup failed: HTTP ${response.status}`);
console.log(JSON.stringify(await response.json()));
