# 部署到自己的 Cloudflare 账号

这是独立于 Sites 的部署。使用 Cloudflare Workers 和 D1 数据库；正文和四小时快照都保存在 D1，无需开通 R2，不需要个人电脑持续开机。D1 在 Workers Free 计划下可使用免费额度。

## 1. 创建 D1 数据库

进入 **Storage & databases → D1 → Create database**，名称填 **`sufe-wiki-db`**。复制详情页的 **Database ID**。它是资源编号，不是密码，可以作为构建变量。

## 2. 修改 GitHub 自动部署设置

在 **Workers & Pages** 打开已经关联此 GitHub 仓库的 Worker，进入 **Settings → Builds**，使用下面的配置：

| 项目 | 值 |
| --- | --- |
| Git 仓库 | `kyx07021-art/SufeWiki` |
| 生产分支 | `main` |
| 根目录 | `/`（仓库内直接是 package.json） |
| 构建命令 | `npm run build:cloudflare` |
| 部署命令 | `npm run deploy:cloudflare` |

在 **Build variables and secrets** 添加：

| 构建变量 | 值 |
| --- | --- |
| `CF_D1_DATABASE_ID` | 上一步复制的 Database ID，必填 |
| `CF_WORKER_NAME` | 当前 Worker 的名字，必须与控制台一致；新建时推荐 `sufe-wiki` |

这是构建变量，不是 Worker 运行时变量。默认数据库名称为 `sufe-wiki-db`。如果修改名称，也要修改 `vite.config.ts` 中对应名称。

部署脚本先应用尚未执行的 D1 迁移，再上传 Worker。构建使用的 API token 必须具备本账号的 **D1 Edit、Workers Scripts Edit** 权限，以及 Cloudflare 构建要求的账号读取权限。若自动生成的构建 token 缺少 D1 权限，在 Builds 中选择具备这些权限的自定义 token；不要把 token 提交到 GitHub。

点击 **Retry build / 重试构建**。部署成功后访问控制台显示的 `workers.dev` 地址；也可以之后绑定自有域名。首次读取空数据库会导入仓库内的 100 个条目。后续代码部署保留在线编辑内容。

这是动态网站，选择 Workers；只上传 `dist/client` 到静态 Pages 无法保存贡献。

官方说明：https://developers.cloudflare.com/workers/ci-cd/builds/configuration/

## 3. 管理员恢复权限

普通同学可以直接阅读和编辑，不需要登录。独立 Cloudflare 部署不使用 Sites 注入的登录邮箱；管理员读取、下载和恢复备份使用一个独立密钥。

在本机生成密钥（只在你自己的终端保存结果）：

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

在 Worker 的 **Settings → Variables and Secrets** 添加 **Secret**，名称 **`MAINTENANCE_TOKEN`**，值为生成的密钥。这是运行时 Secret，不是 Build variable。不要发给贡献者，也不要写入源码。未配置时管理员接口不可用，普通编辑和定时备份仍可运行。

列出备份时请求：

```http
GET /api/backups
Authorization: Bearer <MAINTENANCE_TOKEN>
```

下载指定备份使用 `GET /api/backups?key=<URL 编码后的 key>`，同样带 Authorization。

恢复使用 `POST /api/restore`，带 Authorization、`Content-Type: application/json` 和 `Origin: https://你的实际网站域名`，正文为 `{"key":"备份 key"}`。恢复会先保存一份当前内容的救援快照。

## 4. 备份与迁移

独立 Worker 自带四小时 Cron Trigger，部署后自动启用；北京时间每天 0、4、8、12、16、20 点运行，保持电脑关机也能执行。可在 Worker 的 Triggers 和 Logs 查看触发及失败记录。Cron 配置传播最多需要约 15 分钟。

首次部署后可手动 `POST /api/backups` 保存第一份快照，并在 D1 `backups`、`wiki_snapshots`、`wiki_snapshot_sections` 表确认记录。相同四小时内重复调用不会覆盖已有快照。快照按条目分行保存，下载时重建完整 JSON，避免将整站塞进单个数据库行。快照与正文在同一个数据库内，维护者还可以从 Cloudflare 控制台导出整个 D1 数据库到本机保存。

原 Sites 网站的数据库和备份与这个账号的资源独立。若原站已有新贡献，先用原站管理员下载最新备份，再用新站管理员接口恢复；GitHub 种子文档不会自动同步原站在线编辑。确认新站内容与备份后，再对外使用新链接。

官方说明：https://developers.cloudflare.com/workers/configuration/cron-triggers/

D1 免费额度：https://developers.cloudflare.com/d1/platform/pricing/

## 本地手动部署（可选）

```powershell
cd C:\Users\Lenovo\Desktop\SufeWiki\site
git pull github main
npx wrangler login
$env:CF_D1_DATABASE_ID = '你创建的 Database ID'
$env:CF_WORKER_NAME = 'sufe-wiki'
npm run build:cloudflare
npm run deploy:cloudflare
```

不要直接运行旧的 `npm run build` 后再部署到个人账号；旧命令保留 Sites 构建流程和本地占位资源。
