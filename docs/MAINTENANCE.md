# 维护与恢复

## 数据位置

线上正文存储在 D1 的 `sections` 表，不依赖浏览器或 GitHub。每次编辑会在同一个数据库事务里保存旧条目到 `revisions`，再更新当前内容。发布新代码不会覆盖已有正文；只有空数据库才读取 `content/seed.json`。

整站快照保存在 R2 的 `wiki/` 前缀下，包含全部章节、树结构和 Markdown 正文。每 4 小时一个 UTC 时间槽，相同槽只写一次，重试不会覆盖历史快照；未设置自动清理。`backups` 表记录文件名、章节数和 SHA-256。

`POST /api/backups` 只允许建立当前槽的快照，不提供读取、删除或恢复能力。本站默认私有，外层由 Sites 访问控制保护。今后开放访问后，该端点依然无法覆盖旧快照。R2 没有公开文件 URL。

## 定时运行

Sites 云端任务每 4 小时调用一次快照接口；不是依赖用户打开浏览器。每次从本站 `get_site` 获取当前服务访问凭据，仅将其用于本站请求头 `OAI-Sites-Authorization`，不得保存在源码、日志或任务提示中。

请求成功后，返回 `key`、`sha256`、`created`；使用 Sites 的数据库读取能力检查 `backups` 表中对应记录，核对文件名与校验值。接口失败时保留旧备份，报告失败；可安全重试。不要重新部署网站来做备份。

本地手动运行：

```powershell
'{"origin":"http://127.0.0.1:5173/"}' | node scripts/backup.mjs
```

## 下载与恢复（只有维护者）

生产维护者由 Sites 环境变量 `ADMIN_EMAIL` 指定，比较平台验证过的登录邮箱；不会接受浏览器自行填写的邮箱。普通贡献者不能读取或恢复备份。前端没有备份菜单。

1. 维护者登录网站；如需登录，访问 `/signin-with-chatgpt?return_to=/`。
2. 直接打开 `/api/backups` 查看最近 100 个备份记录。
3. 访问 `/api/backups?key=经过URL编码的文件名` 下载 JSON。可离线检查其中的 `markdown`。
4. 决定恢复后，在本站浏览器控制台执行下面的请求，替换文件名：

```js
await fetch('/api/restore', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'wiki/具体时间.json' })
}).then(response => response.json())
```

恢复会先把当前全文另存为 `before-restore/` 下的救援快照，再在一个 D1 事务中恢复选定的全部章节。恢复后的版本号递增，仍在打开的旧编辑窗口必须处理冲突。救援快照也能用相同接口恢复。刷新页面查看结果。

整站恢复会移除选定快照之后新增的条目；这些条目仍保存在救援快照和 `revisions` 中。普通修正直接编辑对应章节即可。

## GitHub

在 PowerShell 中：

```powershell
cd C:\Users\Lenovo\Desktop\SufeWiki\site
gh auth login -h github.com -p https -w
gh repo create SufeWiki --public --source=. --remote=github --push
```

`github` 是独立远程名称，保留 Sites 托管所使用的远程。若希望代码不公开，把 `--public` 换成 `--private`。以后推送使用 `git push github main`。

GitHub 保存网站源码，不自动同步线上编辑内容，也不承担运行时数据库。使用网页「下载正文」或后台快照保存内容。GitHub Pages 只能托管静态文件，不能直接运行本项目的共享编辑与后台备份。

参考：[GitHub CLI 创建仓库](https://cli.github.com/manual/gh_repo_create)、[D1 外键与事务](https://developers.cloudflare.com/d1/sql-api/sql-statements/)。
