#!/bin/bash

# === 配置区 ===
# 服务器信息
USER="root"
HOST="74.48.78.100"
REMOTE_DIR="/root/code/deploy"

# 需要打包的文件/目录
FILES=".next node_modules package.json .env.local"

# 压缩包名称
TAR_FILE="deploy.tar.gz"

# === 本地构建 ===
echo "[1/5] 本地安装依赖..."
npm install || { echo "npm install 失败"; exit 1; }

echo "[2/5] 本地构建..."
npm run build || { echo "npm run build 失败"; exit 1; }

echo "[3/5] 打包文件..."
tar -czvf $TAR_FILE $FILES || { echo "打包失败"; exit 1; }

# === 上传到服务器 ===
echo "[4/5] 上传到服务器..."
scp $TAR_FILE $USER@$HOST:$REMOTE_DIR/ || { echo "上传失败"; exit 1; }

# === 远程解压并用 pm2 启动 ===
echo "[5/5] 远程解压并用 pm2 启动..."
ssh $USER@$HOST << EOF
  set -e
  cd $REMOTE_DIR
  tar -xzvf $TAR_FILE
  rm $TAR_FILE
  echo "解压完成，准备重启 pm2 进程..."
  if pm2 describe nextjs-sports-analyzer > /dev/null; then
    pm2 reload nextjs-sports-analyzer
  else
    pm2 start npm --name "nextjs-sports-analyzer" -- start
  fi
  pm2 save
EOF

echo "部署完成！"