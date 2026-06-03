# Docker Deployment

Updated: 2026-06-03

This guide runs Open Sales Assistant with Docker Compose.

Docker is recommended when you want a repeatable self-hosted deployment without manually installing Node.js on the host.

## 1. Requirements

- Docker Engine
- Docker Compose v2

Check:

```bash
docker --version
docker compose version
```

## 2. Configure Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3100
PUBLIC_BASE_URL=http://localhost:3100
STORAGE_DRIVER=json

ADMIN_USERNAME=admin
ADMIN_PASSWORD=set_a_strong_password

AI_PROVIDER=kimi
AI_BASE_URL=https://api.moonshot.cn/v1
AI_API_KEY=replace_with_your_own_api_key
AI_TEXT_MODEL=kimi-k2.6
AI_VISION_MODEL=kimi-k2.6
```

Do not commit `.env` to GitHub.

If `AI_API_KEY` is empty, the app still starts and uses local fallback responses for AI-dependent flows.

## 3. Start

```bash
docker compose up -d --build
```

Open:

```text
http://localhost:3100/
http://localhost:3100/login.html
http://localhost:3100/admin.html
http://localhost:3100/api/health
```

## 4. Logs and Status

```bash
docker compose ps
docker compose logs -f
```

## 5. Stop

```bash
docker compose down
```

This stops the container but keeps local `data/` and `uploads/` files.

## 6. Data Persistence

`docker-compose.yml` mounts:

| Host path | Container path | Purpose |
| --- | --- | --- |
| `./data` | `/app/data` | JSON database and backups |
| `./uploads` | `/app/uploads` | Uploaded files |

JSON storage remains the default storage mode:

```env
STORAGE_DRIVER=json
```

Future PostgreSQL/MySQL support should be added as optional adapters. The Docker quick start does not require a database.

## 7. Update

```bash
git pull
docker compose up -d --build
```

Do not overwrite production `data/db.json` unless you intentionally want to reset data.

## 8. Reverse Proxy

For production domains, put Nginx or another reverse proxy in front of the container:

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

## 9. Troubleshooting

If the container starts but AI responses are fallback responses, check:

```bash
docker compose exec open-sales-assistant printenv AI_API_KEY
docker compose logs -f
```

If file uploads fail, check that the host `uploads/` directory is writable by Docker.
