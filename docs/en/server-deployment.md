# Server Deployment

## 1. Basics

Application port: `3100`

Recommended deployment directory:

```text
/opt/open-sales-assistant
```

The server needs Node.js 20 or newer.

## 2. Upload Code

```bash
scp -r open-sales-assistant root@your-server-ip:/opt/open-sales-assistant
```

If an older version exists, back it up first:

```bash
mv /opt/open-sales-assistant /opt/open-sales-assistant.bak.$(date +%Y%m%d%H%M%S)
```

## 3. Configure Environment Variables

```bash
cd /opt/open-sales-assistant
cp .env.example .env
vi .env
```

Example:

```env
PORT=3100
PUBLIC_BASE_URL=https://your-domain
DATA_BACKUP_DIR=/opt/open-sales-assistant-backups

ADMIN_USERNAME=admin
ADMIN_PASSWORD=set_a_strong_password

AI_PROVIDER=kimi
AI_BASE_URL=https://api.moonshot.cn/v1
AI_API_KEY=replace_with_your_own_api_key
AI_TEXT_MODEL=kimi-k2.6
AI_VISION_MODEL=kimi-k2.6
```

Production deployments must use a server-side `.env`. Do not upload `.env` to GitHub and do not store API keys in `data/db.json`.

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

## 4. Install Dependencies

```bash
cd /opt/open-sales-assistant
npm install --omit=dev
```

## 5. Start with PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Check status:

```bash
pm2 status
pm2 logs open-sales-assistant
```

## 6. Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Validate and reload:

```bash
nginx -t
systemctl reload nginx
```

## 7. Verify

```bash
curl https://your-domain/api/health
```

The health check returns `aiConfigured` and model names but never returns the API key.

Open in a browser:

```text
https://your-domain/
https://your-domain/login.html
https://your-domain/admin.html
```

## 8. Data Paths

| Path | Purpose |
| --- | --- |
| `/opt/open-sales-assistant/data/db.json` | Demo or self-hosted data |
| `/opt/open-sales-assistant/uploads` | Uploaded files |
| `/opt/open-sales-assistant-backups` | Recommended backup directory |
