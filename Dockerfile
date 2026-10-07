# ---------- 阶段 1：构建前端 ----------
FROM node:24-alpine AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---------- 阶段 2：运行后端 ----------
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

# 拷贝后端代码与依赖
COPY server/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server/src ./src

# 拷贝构建好的前端静态文件
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

ENV PORT=3000
ENV FE_DIST=/app/frontend/dist
ENV DATA_DIR=/app/data

RUN mkdir -p /app/data/uploads && chown -R node:node /app/data
USER node

EXPOSE 3000

CMD ["node", "src/index.js"]