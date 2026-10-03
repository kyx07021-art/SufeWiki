import { spawnSync } from "node:child_process";

// Apply tracked migrations before publishing the Worker that uses them.
for (const args of [
  ["d1", "migrations", "apply", "DB", "--remote", "--config", "dist/server/wrangler.json"],
  ["deploy", "--config", "dist/server/wrangler.json"],
]) {
  const result = spawnSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", ...args], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
