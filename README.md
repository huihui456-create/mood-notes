# 🌤 心情笔记

一个记录当下心情、坚持长期记录、并能回看自己情绪轨迹的个人心情日记。

## ✨ 功能

- **快速记录**：8 类心情一键选择 + 感受强度滑杆 + 文字描述 + 配图（≤5MB，自动压缩）
- **补记**：忘了也没关系，选个过去的日期补记，自动带"补记"标签
- **时间线**：按倒序回看全部记录，支持按心情 / 年份筛选，点击查看详情、编辑、删除
- **统计**：记录次数 / 记录天数 / 连续打卡 / 心情分布环形图 / 日历热力图
- **回顾**：按月份浏览，或"和过去聊聊"随机抽一条往日心情
- **导出**：随时导出全部数据（JSON / CSV），数据永远属于你

## 🛠 技术栈

- 前端：React + Vite + ECharts
- 后端：Node.js + Express
- 数据库：SQLite（Node 内置驱动，零运维）
- 图片：本地存储 + sharp 自动压缩
- 部署：Docker Compose 一键启动

## 🚀 本地运行

```bash
# 1. 后端
cd server
npm install --cache ./.npm-cache
npm start        # 端口 3000

# 2. 前端（另开一个终端）
cd frontend
npm install --cache ./.npm-cache
npm run dev      # 打开 http://localhost:5173
```

## 🐳 Docker 部署

创建镜像并启动：

```bash
docker compose up -d --build
```

访问 `http://服务器IP:3000`。详细保姆级部署教程见 [DEPLOY.md](DEPLOY.md)。

数据持久化在 `data/` 目录（数据库 `mood.db` + 上传图片 `uploads/`），备份 = 拷贝该目录。

## 📁 目录结构

```
├── frontend/          # 前端源码（React）
│   └── src/
│       ├── pages/     # 页面：首页/记录/时间线/统计/回顾/我的
│       └── components/# 通用组件
├── server/            # 后端服务（Express）
│   └── src/
│       ├── index.js   # 主服务：API + 静态托管
│       ├── db.js      # SQLite 数据库
│       └── moods.js   # 心情分类配置
├── Dockerfile         # 多阶段构建
├── docker-compose.yml # 编排：端口、持久化、自动重启
└── DEPLOY.md          # 保姆级部署指南
```

## 📄 产品文档

需求文档见 `心情笔记产品需求文档.md`。