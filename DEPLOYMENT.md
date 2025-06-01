# 部署指南 (Deployment Guide)

## 🎯 部署概述

本项目支持部署到 Vercel 平台，采用前后端分离的部署策略。后端使用 Vercel Serverless Functions，前端使用 Vercel 静态站点托管。

## 📋 部署前准备

### 1. 账户准备
- [Vercel 账户](https://vercel.com/signup)
- [Google AI Studio API Key](https://makersuite.google.com/app/apikey)
- GitHub 仓库 (推荐)

### 2. 项目准备
确保项目结构正确：
```
sports-posture-analyzer/
├── backend/          # 后端代码
│   ├── server.js
│   ├── package.json
│   └── vercel.json
└── front/           # 前端代码
    ├── src/
    ├── package.json
    └── vite.config.ts
```

## 🚀 后端部署 (Vercel Serverless)

### 1. 配置 vercel.json

确保 `backend/vercel.json` 配置正确：

```json
{
  "version": 2,
  "functions": {
    "server.js": {
      "maxDuration": 300
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/server.js"
    },
    {
      "source": "/(.*)",
      "destination": "/server.js"
    }
  ]
}
```

### 2. 修改 package.json

确保 `backend/package.json` 包含正确的启动脚本：

```json
{
  "name": "sports-posture-analyzer-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "build": "echo 'No build step required'",
    "vercel-build": "echo 'No build step required'"
  },
  "dependencies": {
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "@google/genai": "^0.3.0",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.0"
  }
}
```

### 3. 部署后端

#### 方法 1: 通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 进入后端目录
cd backend

# 登录 Vercel
vercel login

# 部署
vercel --prod

# 设置环境变量
vercel env add GEMINI_API_KEY
```

#### 方法 2: 通过 GitHub 集成

1. 将代码推送到 GitHub
2. 在 Vercel Dashboard 中导入项目
3. 选择 `backend` 目录作为根目录
4. 设置环境变量

### 4. 环境变量配置

在 Vercel Dashboard 中设置以下环境变量：

| 变量名 | 值 | 环境 |
|--------|----|----|
| `GEMINI_API_KEY` | 你的 Google AI API Key | Production, Preview, Development |

### 5. 验证后端部署

部署完成后，访问以下端点验证：

```bash
# 健康检查
curl https://your-backend.vercel.app/

# API 测试
curl https://your-backend.vercel.app/api/hello
```

## 🎨 前端部署 (Vercel Static)

### 1. 配置环境变量

创建 `front/.env.production`：

```env
VITE_API_BASE_URL=https://your-backend.vercel.app/api
```

### 2. 更新 vite.config.ts

确保 `front/vite.config.ts` 配置正确：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
})
```

### 3. 部署前端

#### 方法 1: 通过 Vercel CLI

```bash
# 进入前端目录
cd front

# 构建项目
npm run build

# 部署
vercel --prod
```

#### 方法 2: 通过 GitHub 集成

1. 在 Vercel Dashboard 中创建新项目
2. 选择 `front` 目录作为根目录
3. 设置构建命令: `npm run build`
4. 设置输出目录: `dist`
5. 设置环境变量

### 4. 环境变量配置

在 Vercel Dashboard 中设置：

| 变量名 | 值 | 环境 |
|--------|----|----|
| `VITE_API_BASE_URL` | https://your-backend.vercel.app/api | Production, Preview, Development |

## 🔧 高级配置

### 1. 自定义域名

#### 后端域名配置
```bash
# 在 Vercel Dashboard 中
1. 进入后端项目设置
2. 点击 "Domains"
3. 添加自定义域名: api.yourdomain.com
4. 配置 DNS 记录
```

#### 前端域名配置
```bash
# 在 Vercel Dashboard 中
1. 进入前端项目设置
2. 点击 "Domains"
3. 添加自定义域名: yourdomain.com
4. 配置 DNS 记录
```

### 2. CORS 配置

如果使用自定义域名，需要在后端添加 CORS 配置：

```javascript
// server.js
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://yourdomain.com',
    'https://your-frontend.vercel.app'
  ],
  credentials: true
}));
```

### 3. 性能优化

#### 后端优化
```javascript
// server.js
// 添加压缩中间件
const compression = require('compression');
app.use(compression());

// 设置缓存头
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-cache');
  }
  next();
});
```

#### 前端优化
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['uuid']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
```

## 🔍 监控和日志

### 1. Vercel 日志查看

```bash
# 查看函数日志
vercel logs https://your-backend.vercel.app

# 实时日志
vercel logs --follow
```

### 2. 错误监控

在 `server.js` 中添加错误监控：

```javascript
// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Express 错误处理中间件
app.use((error, req, res, next) => {
  console.error('Express Error:', error);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});
```

### 3. 性能监控

```javascript
// 添加请求日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});
```

## 🚨 故障排除

### 常见部署问题

#### 1. 函数超时
```
错误: Function execution timed out
解决: 
- 检查 vercel.json 中的 maxDuration 设置
- 优化代码性能
- 考虑分解长时间运行的任务
```

#### 2. 环境变量未生效
```
错误: API key not configured
解决:
- 确认在 Vercel Dashboard 中设置了环境变量
- 检查变量名是否正确
- 重新部署项目
```

#### 3. CORS 错误
```
错误: Access to fetch blocked by CORS policy
解决:
- 检查后端 CORS 配置
- 确认前端 API_BASE_URL 正确
- 检查域名配置
```

#### 4. 文件上传失败
```
错误: Request entity too large
解决:
- 检查 Vercel 的请求大小限制 (4.5MB)
- 在前端实现文件压缩
- 考虑使用分片上传
```

### 调试技巧

#### 1. 本地测试生产配置
```bash
# 使用生产环境变量本地测试
cd backend
GEMINI_API_KEY=your_key node server.js

cd front
VITE_API_BASE_URL=https://your-backend.vercel.app/api npm run dev
```

#### 2. 分阶段部署
```bash
# 先部署到预览环境
vercel

# 测试无误后部署到生产环境
vercel --prod
```

## 📊 部署检查清单

### 部署前检查
- [ ] 代码已提交到 Git
- [ ] 环境变量已配置
- [ ] API Key 有效且有足够配额
- [ ] 本地测试通过
- [ ] 构建无错误

### 部署后验证
- [ ] 后端健康检查通过
- [ ] 前端页面正常加载
- [ ] 文件上传功能正常
- [ ] AI 分析功能正常
- [ ] 错误处理正常
- [ ] 性能表现良好

### 生产环境监控
- [ ] 设置错误告警
- [ ] 监控 API 配额使用
- [ ] 定期检查日志
- [ ] 监控响应时间
- [ ] 备份重要数据

## 🔄 持续部署

### GitHub Actions 配置

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy Backend to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.BACKEND_PROJECT_ID }}
          working-directory: ./backend

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v2
      - name: Deploy Frontend to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.FRONTEND_PROJECT_ID }}
          working-directory: ./front
```

---

## 📞 支持

如果在部署过程中遇到问题：

1. 查看 [Vercel 文档](https://vercel.com/docs)
2. 检查 [Google AI 文档](https://ai.google.dev/docs)
3. 提交 Issue 到项目仓库
4. 联系技术支持

---

**注意**: 部署到生产环境前，请确保充分测试所有功能，并备份重要数据。 