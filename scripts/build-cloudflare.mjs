process.env.DEPLOY_TARGET = "cloudflare";
process.argv = [process.execPath, "scripts/run-framework.mjs", "build"];
await import("./run-framework.mjs");
