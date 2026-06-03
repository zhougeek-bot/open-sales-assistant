# Docker 部署说明

更新时间：2026-06-03

本说明用于通过 Docker Compose 运行 Open Sales Assistant。

如果你希望自部署流程可重复，并且不想在宿主机上手动安装 Node.js，建议使用 Docker。

## 1. 环境要求

- Docker Engine
- Docker Compose v2

检查：

```bash
docker --version
docker compose version
```

## 2. 配置环境变量

复制示例文件：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
PORT=3100
PUBLIC_BASE_URL=http://localhost:3100
STORAGE_DRIVER=json

ADMIN_USERNAME=admin
ADMIN_PASSWORD=请设置一个强密码

AI_PROVIDER=kimi
AI_BASE_URL=https://api.moonshot.cn/v1
AI_API_KEY=请替换为你自己的 API Key
AI_TEXT_MODEL=kimi-k2.6
AI_VISION_MODEL=kimi-k2.6
```

不要把 `.env` 提交到 GitHub。

如果 `AI_API_KEY` 为空，应用仍然可以启动，并在依赖 AI 的流程中使用本地 fallback 回复。

## 3. 启动

```bash
docker compose up -d --build
```

打开：

```text
http://localhost:3100/
http://localhost:3100/login.html
http://localhost:3100/admin.html
http://localhost:3100/api/health
```

## 4. 查看状态和日志

```bash
docker compose ps
docker compose logs -f
```

## 5. 停止

```bash
docker compose down
```

该命令会停止容器，但会保留本地 `data/` 和 `uploads/` 文件。

## 6. 数据持久化

`docker-compose.yml` 挂载：

| 宿主机路径 | 容器路径 | 用途 |
| --- | --- | --- |
| `./data` | `/app/data` | JSON 数据库和备份 |
| `./uploads` | `/app/uploads` | 上传文件 |

JSON 存储继续作为默认存储模式：

```env
STORAGE_DRIVER=json
```

后续 PostgreSQL/MySQL 应作为可选适配器加入。Docker 快速启动不需要数据库。

## 7. 更新

```bash
git pull
docker compose up -d --build
```

除非你明确要重置数据，否则不要覆盖生产环境的 `data/db.json`。

## 8. 反向代理

生产域名建议在容器前面放 Nginx 或其他反向代理：

```nginx
server {
    listen 80;
    server_name 你的域名;

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

## 9. 排查

如果容器启动成功，但 AI 回复仍是 fallback，检查：

```bash
docker compose exec open-sales-assistant printenv AI_API_KEY
docker compose logs -f
```

如果上传文件失败，检查宿主机 `uploads/` 目录是否允许 Docker 写入。
