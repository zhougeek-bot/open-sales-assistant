# Open Sales Assistant

[English](README.md) | [简体中文](README.zh-CN.md)

Open Sales Assistant is a self-hosted AI sales assistant starter kit for small teams and individual sales workflows. It helps a team turn sales materials into a searchable knowledge base, answer customer questions, review AI-generated sales suggestions, and keep basic customer follow-up records.

The included dataset is an English demo for a training course sales scenario. It is kept as an initial example so new users can run the project immediately and understand the workflow.

For Chinese readers, see [README.zh-CN.md](README.zh-CN.md) for the full Chinese project overview, quick start, AI API configuration, and roadmap.

## Features

- H5/customer chat entry for sales consultation.
- Admin login and sales knowledge base management.
- Text, document, and image material upload.
- AI-assisted material analysis and pending suggestions.
- FAQ, sales playbook, concern handling, and knowledge summary editing.
- Customer profile, chat history, AI analysis, and follow-up records.
- Certificate record import and query demo flow.
- JSON-file storage for local development and small self-hosted trials.
- Planned optional database adapters while keeping JSON storage as the default lightweight mode.
- English-first UI with an English/Chinese switch for customer chat, admin login, and admin console.
- English and Chinese demo fixtures. Local demo mode can switch the demo dataset together with the UI language.

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Docker quick start:

```bash
cp .env.example .env
docker compose up -d --build
```

Open:

- Customer entry: http://localhost:3100/
- Customer login: http://localhost:3100/login.html
- Admin console: http://localhost:3100/admin.html
- Health check: http://localhost:3100/api/health

Default admin credentials are configured in `.env`:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=请设置一个强密码
```

Set `AI_API_KEY` before using AI analysis or chat generation.

## Configure Your Own AI API

Open Sales Assistant uses environment variables for AI settings. It does not store API keys in the admin UI or in `data/db.json`.

Create your local `.env` file:

```bash
cp .env.example .env
```

Then edit `.env` and set your own OpenAI-compatible API key:

```env
AI_PROVIDER=kimi
AI_BASE_URL=https://api.moonshot.cn/v1
AI_API_KEY=your_api_key_here
AI_TEXT_MODEL=kimi-k2.6
AI_VISION_MODEL=kimi-k2.6
```

Do not commit `.env` to GitHub. The repository `.gitignore` already excludes it.

If `AI_API_KEY` is empty or still contains the placeholder text, the app uses local fallback responses. This is enough to test pages and data flow, but AI analysis and AI chat generation will not call a real model.

Provider examples:

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

# DashScope / Tongyi Qianwen
AI_PROVIDER=dashscope
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_TEXT_MODEL=qwen-plus
AI_VISION_MODEL=qwen-vl-plus
```

The `/api/health` endpoint only reports whether AI is configured and which model names are active. It never returns the API key.

## Documentation

Start here:

- English overview: [README.md](README.md)
- Chinese overview: [README.zh-CN.md](README.zh-CN.md)

| Topic | English | Chinese |
| --- | --- | --- |
| Current version | [current-version.md](docs/en/current-version.md) | [当前版本说明.md](docs/当前版本说明.md) |
| Roadmap | [roadmap.md](docs/en/roadmap.md) | [团队销售工具全功能开发与迭代计划.md](docs/团队销售工具全功能开发与迭代计划.md) |
| Development plan | [development-plan.md](docs/en/development-plan.md) | [开发计划.md](docs/开发计划.md) |
| Data migration and backup | [data-migration-and-backup.md](docs/en/data-migration-and-backup.md) | [数据迁移与备份说明.md](docs/数据迁移与备份说明.md) |
| Storage strategy | [storage-strategy.md](docs/en/storage-strategy.md) | [存储策略.md](docs/存储策略.md) |
| Docker deployment | [docker-deployment.md](docs/en/docker-deployment.md) | [Docker部署说明.md](docs/Docker部署说明.md) |
| Server deployment | [server-deployment.md](docs/en/server-deployment.md) | [服务器部署说明.md](docs/服务器部署说明.md) |
| BT Panel deployment | [bt-panel-deployment.md](docs/en/bt-panel-deployment.md) | [宝塔面板部署指南.md](docs/宝塔面板部署指南.md) |

## Development Checks

```bash
npm test
```

The test command runs JavaScript syntax checks and a local smoke test for the health endpoint plus the main static pages. It does not require an AI API key.

## Demo Data

`data/db.json` contains sample English training-course sales data. Treat it as demo content only:

- It demonstrates how sales materials become a knowledge base.
- It is not a production dataset.
- Replace it with your own product, service, pricing, FAQ, and compliance rules before real use.

To restore the committed demo dataset after local experiments:

```bash
npm run reset-demo
```

Language-specific demo reset commands:

```bash
npm run reset-demo:en
npm run reset-demo:zh
```

The default UI language is English. Selecting Chinese from the UI switches the interface to Chinese and, in local demo mode, switches the demo dataset to the Chinese fixture. In production, public demo switching is disabled unless `DEMO_LANGUAGE_SWITCH=true` is explicitly configured.

## Open Source Boundary

This repository is not a SaaS platform. The current goal is to provide a clear, self-hosted team sales assistant that contributors can run locally, adapt, and improve.

Future work may add stronger team collaboration, role permissions, database storage, integrations, and evaluation workflows, but the open-source baseline remains focused on helping a team own its sales assistant without depending on a hosted commercial platform.

JSON file storage will remain supported as the default lightweight mode. Future PostgreSQL/MySQL support should be added through optional storage adapters, not by removing the current JSON workflow.

## Roadmap

- Improve sales follow-up workspace: status, owner, next action, and reminders.
- Add operation logs and safer data backup/restore workflows.
- Add editable AI suggestions and knowledge version history.
- Add optional PostgreSQL/MySQL storage adapters while preserving JSON storage.
- Improve Docker deployment and production self-hosting examples.
- Add customer segmentation and sales funnel dashboards.
- Add connector examples for CRM, forms, chat tools, and spreadsheets.
- Add tests and prompt evaluation cases for stable community contributions.

## Codex for Open Source Goal

This project is being prepared as an open-source sales assistant starter kit. Codex would be used for maintainer workflows such as issue triage, PR review, test generation, release notes, documentation updates, and prompt/evaluation improvements.

## License

MIT
