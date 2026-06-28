# 多阶段构建：构建层编译 TS，运行层只装生产依赖，镜像更小更安全。
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# 运行层：只装生产依赖，不含 devDeps。
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# 默认监听回环；容器内需监听 0.0.0.0 才能被宿主/反代访问。
ENV HOST=0.0.0.0
ENV PORT=3001

# 非 root 用户运行
RUN addgroup -S app && adduser -S app -G app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER app
EXPOSE 3001

# 健康检查打到 /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
