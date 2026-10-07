#!/bin/bash
# 心情笔记一键部署脚本
# 用法：./deploy.sh
# 在服务器项目目录（包含 docker-compose.yml 的目录）下执行

set -e

echo "========================================"
echo "  心情笔记 · 一键部署"
echo "========================================"

# 1. 检查 Docker
if ! command -v docker &>/dev/null; then
  echo "[1/3] 未检测到 Docker，开始安装..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER
  echo "Docker 安装完成。请退出并重新登录终端后，再次运行 ./deploy.sh"
  exit 1
fi
echo "[1/3] ✅ Docker 已安装"

# 2. 检查 docker compose
if ! docker compose version &>/dev/null; then
  echo "[2/3] 未检测到 docker compose 插件，尝试安装..."
  sudo apt update && sudo apt install -y docker-compose-plugin
fi
echo "[2/3] ✅ docker compose 可用"

# 3. 构建并启动
echo "[3/3] 正在构建镜像并启动服务（首次约需几分钟）..."
sudo docker compose up -d --build

echo ""
echo "========================================"
echo "  ✅ 部署完成！"
echo "  访问地址：http://$(curl -s ifconfig.me 2>/dev/null || echo '你的服务器IP'):3000"
echo "  常用命令："
echo "    查看状态    sudo docker compose ps"
echo "    停止服务    sudo docker compose stop"
echo "    启动服务    sudo docker compose start"
echo "    查看日志    sudo docker logs -f mood-notes"
echo "  数据位置：./data/ （备份=拷贝此目录）"
echo "========================================"