# Current Version

Updated: 2026-06-03

## 1. Positioning

The current version is the initial open-source release of Open Sales Assistant. It is designed for teams and individuals who want to self-host a sales assistant with a sales knowledge base, customer chat entry point, AI-assisted replies, customer profiles, and basic follow-up records.

Suitable for:

- Local evaluation and open-source demos.
- Small-team self-hosting.
- Building a sales knowledge base from real sales materials.
- Validating AI-assisted sales consultation and follow-up workflows.

Not suitable for:

- High-concurrency production use.
- Complex permission management for large teams.
- Hosted multi-organization operations.
- Direct use with unredacted private customer data.

## 2. Entry Points

| Page | Local URL | Description |
| --- | --- | --- |
| Customer chat | `http://localhost:3100/` | Nickname registration, chat, certificate lookup, profile center |
| Admin login | `http://localhost:3100/login.html` | Admin username/password login |
| Admin console | `http://localhost:3100/admin.html` | Knowledge base, customers, certificates, materials, settings, operation logs |
| Health check | `http://localhost:3100/api/health` | Service status |

## 3. AI Configuration

The app uses OpenAI-compatible `/chat/completions` APIs. Users should copy `.env.example` to `.env` and provide their own `AI_API_KEY`. The project does not store API keys in the admin UI or in `data/db.json`.

```env
AI_PROVIDER=kimi
AI_BASE_URL=https://api.moonshot.cn/v1
AI_API_KEY=replace_with_your_own_api_key
AI_TEXT_MODEL=kimi-k2.6
AI_VISION_MODEL=kimi-k2.6
```

If `AI_API_KEY` is missing or still contains placeholder text, the app uses local fallback responses so pages and data flow can still be tested.

Provider examples:

- Kimi: `AI_BASE_URL=https://api.moonshot.cn/v1`, model `kimi-k2.6`.
- OpenAI: `AI_BASE_URL=https://api.openai.com/v1`, use a model available to your account.
- DeepSeek: `AI_BASE_URL=https://api.deepseek.com`, model `deepseek-chat`.
- DashScope: `AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1`, model `qwen-plus`.

`/api/health` only returns `aiConfigured` and model names. It never returns the API key.

## 4. Demo Data

`data/db.json` contains English training-course sales demo data.

Notes:

- The data only demonstrates knowledge base, sales playbook, FAQ, objection handling, and chat history structures.
- Replace it with your own product, service, pricing, FAQ, and compliance rules before real use.
- Do not commit real customer private data to the public repository.

## 5. Data Storage

Current data file:

```text
data/db.json
```

Uploaded files:

```text
uploads/
```

Default backup directory:

```text
data/backups/
```

`.gitignore` excludes `.env`, `uploads/`, and `data/backups/`.

JSON storage remains the default lightweight mode for local demos and small self-hosted trials. Future PostgreSQL/MySQL support should be added through optional storage adapters instead of replacing JSON storage.

Dockerfile and Docker Compose deployment are available for containerized self-hosting.

## 6. Current Limitations

- No sales member roles or permissions.
- No customer owner, follow-up reminders, or funnel views.
- Basic operation logs are available for key admin write actions.
- No knowledge base version rollback.
- No AI usage or cost statistics.
- JSON storage is not suitable for high-concurrency multi-user writes.

## 7. Next Steps

Priority areas:

1. Team sales workspace.
2. Stronger operation log filters, detail views, and export.
3. Knowledge versioning and editable AI suggestions.
4. Basic tests and prompt evaluation.
5. Optional database adapters that preserve JSON mode.

See:

```text
docs/en/roadmap.md
```
