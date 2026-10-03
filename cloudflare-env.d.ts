declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    ADMIN_EMAIL: string;
    DEPLOYMENT_TARGET?: "cloudflare";
    MAINTENANCE_TOKEN?: string;
  }
}
