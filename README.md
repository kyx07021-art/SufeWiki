# 上财 Wiki

面向上财学生的共建知识库。左侧分层目录，右侧连续正文；逐节编辑、新增条目、搜索、Markdown 预览、草稿、即时发布、冲突合并和全文导出。

## 本地启动

需要 Node.js 22.13 或以上版本。

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_soft_scorpion.sql
npm.cmd run dev
```

迁移只在首次创建本地数据库时执行一次。开发地址由终端打印，默认 `http://127.0.0.1:5173/`。本地数据库与对象存储位于被忽略的 `.wrangler/state`。

## 内容与协作

- [整理后的正文](content/wiki.md)：只来自原稿正文，不包含上半部分 AI 资料。
- [Wiki 规范与贡献路径](content/contributing.md)：同时出现在网站的「贡献指南」。
- [清理记录](docs/CONTENT.md)：说明删改范围和未核实信息。
- [备份、恢复与 GitHub 操作](docs/MAINTENANCE.md)。

在线修改保存在 D1；Git 中的种子文档只初始化空数据库。更新代码不会覆盖学生的在线贡献。

## 代码结构

- `components/wiki.tsx`：连续阅读、目录、搜索与导出。
- `components/editor.tsx`：章节编辑、预览、临时草稿与发布。
- `lib/wiki.ts`：章节树、Markdown 导出及标题换行修复。
- `lib/wiki-store.ts`：持久化、旧版本与并发编辑语义。
- `lib/backups.ts` / `lib/maintenance.ts`：不可覆盖的整站快照和维护者恢复。
- `app/api/`：章节、备份和恢复接口。
- `db/schema.ts` / `drizzle/`：数据库结构与迁移。

## API

| 接口 | 行为 |
| --- | --- |
| `GET /api/sections` | 返回完整 Wiki，供连续阅读 |
| `POST /api/sections` | 新增章节 `{parentId,title,body}`，立即发布 |
| `PUT /api/sections/:id` | 更新 `{title,body,revision}`；版本过期返回 409 |
| `POST /api/backups` | 为当前四小时槽建立一次不可覆盖快照 |
| `GET /api/backups` | 仅维护者可列出或下载快照 |
| `POST /api/restore` | 仅维护者可恢复指定快照，先保存救援副本 |

创建和编辑不自动重试。网络中断时先刷新正文确认发布结果；草稿仍保存在本机。正文使用安全的 Markdown 渲染，不执行 HTML。

## 检查与部署

**部署到自己的 Cloudflare 账号：**按 [Cloudflare 部署步骤](docs/CLOUDFLARE.md) 配置 D1 和 GitHub 自动部署，无需 R2。使用 `npm run build:cloudflare` 与 `npm run deploy:cloudflare`；下面的普通 `build` 命令用于 Sites。

```powershell
node node_modules/typescript/bin/tsc --noEmit
npm.cmd run build
```

依照项目要求，不编写测试代码。通过类型检查、构建与实际功能操作确认实现。

当前部署使用 Sites，绑定 D1 `DB` 和 R2 `BUCKET`。后台调度每四小时触发快照，访问范围独立于代码发布。维护者邮箱在托管环境配置为 `ADMIN_EMAIL`；不要把 `.env.local` 提交到仓库。
