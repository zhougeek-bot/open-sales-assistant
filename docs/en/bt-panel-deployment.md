# BT Panel Deployment

Use this guide for BT Panel + Node project + your own domain.

Open Sales Assistant is not a static HTML site. It needs a Node.js service for `/api/*`, uploads, local data storage, and AI API calls.

## 1. Prepare Directory

Recommended server directory:

```text
/www/wwwroot/open-sales-assistant
```

## 2. Upload Code

Upload the `open-sales-assistant` project files to that directory.

Do not upload:

- `.env`
- `node_modules/`
- `uploads/`
- `data/backups/`

You can upload `data/db.json` if you want to keep the demo data. When updating an existing deployment, do not overwrite the server's existing `data/db.json`.

## 3. Install Node.js

Install the Node.js version manager in BT Panel and choose Node.js 20 LTS or 22 LTS.

## 4. Install Dependencies

```bash
cd /www/wwwroot/open-sales-assistant
npm install --omit=dev
```

## 5. Configure `.env`

```env
PORT=3100
PUBLIC_BASE_URL=https://your-domain
DATA_BACKUP_DIR=/www/backup/open-sales-assistant

ADMIN_USERNAME=admin
ADMIN_PASSWORD=set_a_strong_password

AI_PROVIDER=kimi
AI_BASE_URL=https://api.moonshot.cn/v1
AI_API_KEY=replace_with_your_own_api_key
AI_TEXT_MODEL=kimi-k2.6
AI_VISION_MODEL=kimi-k2.6
```

Production deployments must use their own server-side API key. Do not upload `.env` to GitHub and do not store API keys in `data/db.json`.

This project calls OpenAI-compatible `/chat/completions` APIs. Other compatible providers can be used:

```env
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

## 6. Create Node Project

In BT Panel:

```text
Website -> Node Project -> Add Project
```

Recommended settings:

| Setting | Value |
| --- | --- |
| Project name | `open-sales-assistant` |
| Project directory | `/www/wwwroot/open-sales-assistant` |
| Startup file | `server/index.js` |
| User | `www` |
| Node version | `20.x` or `22.x` |
| Port | `3100` |
| Start command | `npm start` |
| Package manager | `npm` |

## 7. Reverse Proxy

If your domain site already exists, add a reverse proxy:

| Setting | Value |
| --- | --- |
| Proxy name | `open-sales-assistant` |
| Target URL | `http://127.0.0.1:3100` |
| Send domain | `$host` |

For large uploads, add this to Nginx:

```nginx
client_max_body_size 50m;
```

## 8. Verify

Open:

```text
https://your-domain/api/health
https://your-domain/
https://your-domain/login.html
https://your-domain/admin.html
```

`/api/health` should return:

```json
{
  "ok": true,
  "service": "open-sales-assistant"
}
```

The health check never returns the API key.
