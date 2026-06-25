# 摸鱼日历后端

这是摸鱼日历的 Fastify 后端底座，用来承接后续 WeatherKit、匿名访问事件、宾果排行榜等需要服务端能力的功能。

## 本地开发

```bash
cd server
npm install
npm run dev
```

默认监听：

```txt
127.0.0.1:3001
```

健康检查：

```bash
curl http://127.0.0.1:3001/api/health
```

## 环境变量

复制 `.env.example` 为 `.env`，按需填写：

```txt
HOST=127.0.0.1
PORT=3001
CORS_ORIGIN=https://calendar.ismyh.cn

WEATHERKIT_TEAM_ID=
WEATHERKIT_KEY_ID=
WEATHERKIT_SERVICE_ID=
WEATHERKIT_PRIVATE_KEY=
```

`WEATHERKIT_PRIVATE_KEY` 是 Apple Developer 下载的 `.p8` 私钥内容，不要提交到 GitHub。

## 生产部署建议

前端继续由 Nginx 托管静态文件，后端跑在本机回环地址，例如 `127.0.0.1:3001`。Nginx 把 `/api/` 反代给后端：

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3001/api/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

后端构建和启动：

```bash
cd server
npm ci
npm run build
npm run start
```

建议用 `systemd` 或 `pm2` 守护进程。

## 当前接口

- `GET /api/health`：服务健康检查。
- `GET /api/weather?lat=31.2304&lon=121.4737`：天气接口占位；WeatherKit 凭据未配置时返回 `not_configured`。
- `POST /api/events`：匿名事件入口；当前只记录日志，后续可接 SQLite/PostgreSQL 做访问日志和排行榜。
