# Open Sales Assistant

[English](README.md) | 简体中文

Open Sales Assistant 是一个面向团队和个人销售的自部署开源智能销售助手 starter kit。它帮助小团队把销售资料整理成可检索的知识库，让客户可以通过聊天入口咨询问题，让销售或运营人员可以在后台审核 AI 生成的建议、维护销售话术、记录客户跟进信息。

当前仓库不是 SaaS 平台，也不以多租户商业平台作为第一目标。它的定位是让团队可以拥有一套自己的销售助手系统，并在本地或自己的服务器上持续迭代。

仓库内默认保留了一份培训机构销售场景的示例数据，用于帮助新用户快速跑通流程。请把这些数据视为 demo 内容，真实使用前需要替换为你自己的产品资料、价格、FAQ、销售规则和合规说明。

## 适合谁使用

- 小团队想自部署一个 AI 销售助手。
- 个人销售想整理自己的产品资料、话术和客户问答。
- 开发者想基于一个轻量项目扩展 CRM、表单、客服或销售跟进能力。
- 开源贡献者想参与 AI sales assistant、知识库、销售自动化、prompt evaluation 等方向。

## 功能概览

- H5 客户咨询入口。
- 客户登录页和聊天页。
- 管理员登录和后台管理。
- 销售资料库管理。
- 文本、文档、图片资料上传。
- AI 辅助资料分析和待审核建议。
- FAQ、销售话术、异议处理、知识摘要编辑。
- 客户画像、聊天历史、AI 分析和跟进记录。
- 证书记录导入和查询 demo 流程。
- 基于 JSON 文件的本地存储，适合开发和小规模自部署试用。
- 计划增加可选数据库适配，同时保留 JSON 作为默认轻量存储模式。

## 快速启动

```bash
npm install
cp .env.example .env
npm run dev
```

Docker 快速启动：

```bash
cp .env.example .env
docker compose up -d --build
```

打开：

- 客户入口：http://localhost:3100/
- 客户登录：http://localhost:3100/login.html
- 管理后台：http://localhost:3100/admin.html
- 健康检查：http://localhost:3100/api/health

默认管理员账号在 `.env` 中配置：

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=请设置一个强密码
```

使用 AI 分析或 AI 聊天生成前，需要先配置自己的 `AI_API_KEY`。

## 配置自己的 AI API

Open Sales Assistant 通过环境变量配置 AI 服务。项目不会在后台 UI 或 `data/db.json` 中保存用户的 API Key。

先复制环境变量文件：

```bash
cp .env.example .env
```

然后编辑 `.env`，填入你自己的 OpenAI-compatible API Key：

```env
AI_PROVIDER=kimi
AI_BASE_URL=https://api.moonshot.cn/v1
AI_API_KEY=your_api_key_here
AI_TEXT_MODEL=kimi-k2.6
AI_VISION_MODEL=kimi-k2.6
```

不要把 `.env` 提交到 GitHub。仓库 `.gitignore` 已经排除了 `.env`。

如果 `AI_API_KEY` 为空，或者仍然是占位文本，程序会使用本地 fallback 回复。这可以用于验证页面和数据流程，但不会调用真实 AI 模型。

常见服务商配置示例：

```env
# Kimi / Moonshot
AI_PROVIDER=kimi
AI_BASE_URL=https://api.moonshot.cn/v1
AI_TEXT_MODEL=kimi-k2.6
AI_VISION_MODEL=kimi-k2.6

# OpenAI
AI_PROVIDER=openai
AI_BASE_URL=https://api.openai.com/v1
AI_TEXT_MODEL=gpt-4o-mini
AI_VISION_MODEL=gpt-4o-mini

# DeepSeek
AI_PROVIDER=deepseek
AI_BASE_URL=https://api.deepseek.com
AI_TEXT_MODEL=deepseek-chat
AI_VISION_MODEL=deepseek-chat

# DashScope / 通义千问
AI_PROVIDER=dashscope
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_TEXT_MODEL=qwen-plus
AI_VISION_MODEL=qwen-vl-plus
```

`/api/health` 只返回 AI 是否已配置和当前模型名，不会返回 API Key。

## 文档入口

| 主题 | 中文 | English |
| --- | --- | --- |
| 当前版本 | [当前版本说明.md](docs/当前版本说明.md) | [current-version.md](docs/en/current-version.md) |
| Roadmap | [团队销售工具全功能开发与迭代计划.md](docs/团队销售工具全功能开发与迭代计划.md) | [roadmap.md](docs/en/roadmap.md) |
| 开发计划 | [开发计划.md](docs/开发计划.md) | [development-plan.md](docs/en/development-plan.md) |
| 数据迁移与备份 | [数据迁移与备份说明.md](docs/数据迁移与备份说明.md) | [data-migration-and-backup.md](docs/en/data-migration-and-backup.md) |
| 存储策略 | [存储策略.md](docs/存储策略.md) | [storage-strategy.md](docs/en/storage-strategy.md) |
| Docker 部署 | [Docker部署说明.md](docs/Docker部署说明.md) | [docker-deployment.md](docs/en/docker-deployment.md) |
| 服务器部署 | [服务器部署说明.md](docs/服务器部署说明.md) | [server-deployment.md](docs/en/server-deployment.md) |
| 宝塔面板部署 | [宝塔面板部署指南.md](docs/宝塔面板部署指南.md) | [bt-panel-deployment.md](docs/en/bt-panel-deployment.md) |

## 开发检查

```bash
npm test
```

`npm test` 会运行 JavaScript 语法检查和本地 smoke test，覆盖健康检查接口和主要静态页面。测试不需要真实 AI API Key。

## Demo 数据

`data/db.json` 包含培训机构销售场景的示例数据。它的作用是演示销售资料如何变成知识库，不是生产数据。

本地实验后，如果需要恢复仓库中的 demo 数据：

```bash
npm run reset-demo
```

该脚本会从当前 Git `HEAD` 恢复 `data/db.json`。如果项目不在 Git 仓库中，脚本会拒绝运行。

## 开源边界

当前项目目标是提供一个清晰、可自部署、适合团队改造的销售助手基础版本。

未来可以继续扩展：

- 多成员协作和角色权限。
- 数据库存储。
- CRM、表单、客服工具、表格连接器。
- 更完整的客户跟进工作台。
- AI 建议版本管理和审核流程。
- prompt evaluation 和自动化测试。

但当前开源基线仍然聚焦在：让团队可以拥有自己的销售助手，而不是依赖一个托管的商业 SaaS 平台。

JSON 文件存储会继续作为默认轻量模式保留。后续 PostgreSQL/MySQL 应通过可选 storage adapter 加入，而不是删除当前 JSON 工作流。

## Roadmap

- 改进销售跟进工作台：状态、负责人、下一步动作和提醒。
- 增加操作日志和更安全的数据备份/恢复流程。
- 增加可编辑 AI 建议和知识版本历史。
- 增加可选 PostgreSQL/MySQL 存储适配，同时保留 JSON 存储。
- 改进 Docker 部署和生产自部署示例。
- 增加客户分层和销售漏斗看板。
- 增加 CRM、表单、聊天工具、表格等连接器示例。
- 增加测试和 prompt evaluation 用例，方便社区稳定贡献。

## Codex for Open Source 目标

这个项目正在作为开源销售助手 starter kit 准备。Codex 将主要用于维护者工作流，例如 issue triage、PR review、测试生成、release notes、文档更新、prompt/evaluation 改进等。

## License

MIT
