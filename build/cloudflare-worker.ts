import handler from "vinext/server/fetch-handler";
import { saveBackup } from "../lib/backups";

export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    return handler.fetch(request, env, ctx);
  },
  scheduled(_controller: ScheduledController, _env: Cloudflare.Env, ctx: ExecutionContext) {
    ctx.waitUntil(saveBackup().catch(error => {
      console.error('Wiki scheduled backup failed', error);
      throw error;
    }));
  },
};
