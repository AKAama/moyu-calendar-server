# 摸鱼日历后端

这是摸鱼日历的 Fastify 后端底座，用来承接 WeatherKit、匿名访问事件、宾果排行榜、公共午饭盒等需要服务端能力的功能。

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
DATABASE_PATH=data/moyu-calendar.sqlite
ADMIN_TOKEN=请替换为随机长字符串

# 午饭盒内容审核：先走 SQLite 词库，词库通过后可选用 DeepSeek 复审。
CONTENT_REVIEW_ENABLED=false
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

`WEATHERKIT_PRIVATE_KEY` 是 Apple Developer 下载的 `.p8` 私钥内容，不要提交到 GitHub。

`CONTENT_REVIEW_ENABLED=true` 且配置 `DEEPSEEK_API_KEY` 后，用户投喂午饭会先经过 SQLite 词库拦截；词库通过后，再调用 DeepSeek JSON 模式复审。未开启时只使用本地词库，不会触网。

词库会在启动时从 `src/data/content-blocklist.seed.json` 初始化到 SQLite 的 `content_blocklist` 表。实际审核读取的是 SQLite 表，后续可以直接在数据库中维护词库。

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
- `GET /api/calendar?date=2026-07-03`：返回节假日、调休、本月工作日数，以及距离周五和下一个休息日的天数。
- `GET /api/weather?lat=31.2304&lon=121.4737`：天气接口占位；WeatherKit 凭据未配置时返回 `not_configured`。
- `POST /api/events`：匿名事件写入 SQLite。
- `GET /api/admin/events/summary`：事件汇总，需要 `Authorization: Bearer <ADMIN_TOKEN>`。
- `POST /api/bingo/complete`：保存每日宾果成绩。
- `GET /api/bingo/leaderboard?date=2026-07-03`：每日宾果排行榜。
- `GET /api/lunch/items`：返回公共午饭盒列表，包含预置饭和用户投喂的饭。
- `POST /api/lunch/items`：新增午饭盒条目，请求体为 `{ "item": "老乡鸡", "name": "Alex" }`。
- `POST /api/lunch/pick`：从公共午饭盒抽取一条午饭建议；使用“洗牌袋”机制，一轮内每个条目都会被抽到且不会重复。

SQLite 使用 Node.js 内置模块，因此生产环境需要 Node.js 22.5 或更高版本。数据库目录已加入 `.gitignore`，部署时请单独备份。
