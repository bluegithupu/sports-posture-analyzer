# 运动姿态分析大师 (Sports Posture Analyzer)

一个基于 AI 的运动姿态分析系统，使用 Google Gemini AI 对运动视频进行专业的姿态分析和纠正建议。

## 🎯 项目概述

本项目是一个前后端分离的 Web 应用，用户可以上传运动视频，系统会使用 Google Gemini AI 进行智能分析，并生成专业的中文运动姿态分析报告。

### 主要功能

- 📹 **视频上传**: 支持多种视频格式 (MP4, MOV, AVI, MKV, WebM)
- 🤖 **AI 分析**: 使用最新的 Google Gemini 2.5 Flash 模型进行视频分析
- 📊 **专业报告**: 生成详细的中文运动姿态分析报告
- ⚡ **异步处理**: 支持大文件上传和长时间分析任务
- 🔄 **实时状态**: 实时显示分析进度和状态

## 🏗️ 技术架构

### 前端 (Frontend)
- **框架**: React + TypeScript
- **构建工具**: Vite
- **UI 组件**: 自定义组件
- **状态管理**: React Hooks
- **网络请求**: Fetch API

### 后端 (Backend)
- **运行时**: Node.js
- **框架**: Express.js
- **AI 服务**: Google GenAI (@google/genai)
- **文件处理**: Multer
- **环境配置**: dotenv

### 部署
- **前端**: Vercel (计划)
- **后端**: Vercel Serverless Functions (计划)

## 📁 项目结构

```
sports-posture-analyzer/
├── README.md                 # 项目说明文档
├── task.md                   # 任务规划文档
├── package.json             # 项目测试脚本配置
├── test/                    # 测试文件夹 🧪
│   ├── README.md           # 测试说明文档
│   ├── test-r2-config.js   # R2 配置验证脚本
│   ├── test-r2-automation.js # 完整自动化测试
│   ├── demo-r2-flow.js     # 可视化流程演示
│   ├── test-video.mp4      # 测试用视频文件
│   ├── TESTING.md          # 测试指南
│   └── R2_TESTING_SUMMARY.md # 测试功能总结
├── backend/                 # 后端服务
│   ├── server.js           # 主服务文件
│   ├── package.json        # 后端依赖配置
│   ├── vercel.json         # Vercel 部署配置
│   ├── .env                # 环境变量 (需要创建)
│   ├── .gitignore          # Git 忽略文件
│   ├── env-config.md       # 环境变量配置说明
│   └── R2_CONFIG.md        # R2 详细配置说明
├── front/                  # 前端应用
│   ├── src/
│   │   ├── App.tsx         # 主应用组件
│   │   ├── main.tsx        # 应用入口
│   │   └── vite-env.d.ts   # TypeScript 类型定义
│   ├── components/         # 组件目录
│   ├── config/             # 配置文件
│   ├── report/             # 报告相关
│   ├── uploads/            # 上传文件 (本地开发)
│   ├── utils/              # 工具函数
│   ├── package.json        # 前端依赖配置
│   ├── vite.config.ts      # Vite 配置
│   ├── .env                # 前端环境变量 (需要创建)
│   └── env-config.md       # 环境变量配置说明
├── R2_DEPLOYMENT.md        # R2 部署配置指南
├── R2_BUGFIX_GUIDE.md      # R2 问题修复指南
├── R2_TASK.md              # R2 任务规划文档
└── DEVELOPMENT.md          # 开发指南
```

## 🚀 快速开始

### 前置要求

- Node.js 16+ 
- npm 或 yarn
- Google AI Studio API Key

### 1. 克隆项目

```bash
git clone <repository-url>
cd sports-posture-analyzer
```

### 2. 后端设置

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 创建环境变量文件
cp env-config.md .env
# 编辑 .env 文件，添加你的 GEMINI_API_KEY
```

### 3. 前端设置

```bash
# 进入前端目录
cd ../front

# 安装依赖
npm install

# 创建环境变量文件
cp env-config.md .env
# 编辑 .env 文件，设置 VITE_API_BASE_URL
```

### 4. 启动开发服务器

```bash
# 启动后端 (在 backend 目录)
npm start
# 后端将运行在 http://localhost:5002

# 启动前端 (在 front 目录)
npm run dev
# 前端将运行在 http://localhost:5173
```

### 5. 运行测试 🧪

```bash
# 进入测试目录
cd test

# 验证 R2 配置
npm run test:config

# 运行完整自动化测试
npm run test

# 查看可视化流程演示
npm run demo
```

详细测试说明请查看 [`test/README.md`](test/README.md)。

## 🔧 环境变量配置

### 后端环境变量 (.env)

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 前端环境变量 (.env)

```env
VITE_API_BASE_URL=http://localhost:5002/api
```

## 📡 API 接口

### 1. 文件上传

```http
POST /api/upload
Content-Type: multipart/form-data

Body: file (视频文件)
```

**响应:**
```json
{
  "message": "File uploaded successfully",
  "file_id": "uuid-filename.mp4",
  "original_filename": "original.mp4",
  "mimetype": "video/mp4",
  "size": 5654189
}
```

### 2. 开始分析

```http
POST /api/analyze
Content-Type: application/json

{
  "file_id": "uuid-filename.mp4",
  "original_filename": "original.mp4",
  "mimetype": "video/mp4"
}
```

**响应:**
```json
{
  "message": "Analysis started.",
  "job_id": "analysis-job-uuid"
}
```

### 3. 查询分析结果

```http
GET /api/results/{job_id}
```

**响应 (处理中):**
```json
{
  "status": "processing",
  "message": "File uploaded. Starting AI analysis..."
}
```

**响应 (完成):**
```json
{
  "status": "completed",
  "report": "详细的分析报告内容..."
}
```

**响应 (失败):**
```json
{
  "status": "failed",
  "error": "错误信息"
}
```

## 🎨 使用流程

1. **上传视频**: 用户选择并上传运动视频文件
2. **视频压缩**: 前端自动压缩大文件以提高上传速度
3. **文件上传**: 视频上传到后端服务器
4. **AI 分析**: 后端将文件上传到 Google AI 并调用 Gemini 模型分析
5. **生成报告**: AI 生成专业的中文运动姿态分析报告
6. **展示结果**: 前端展示分析结果和改进建议

## 🔍 分析报告内容

AI 分析报告包含以下内容：

- **主要体态问题**: 识别 2-3 个主要的动态体态问题
- **负面影响分析**: 详细说明问题对运动表现和健康的影响
- **纠正建议**: 提供具体的技术提示和训练方法
- **整体评估**: 对动作流畅性、协调性的综合评价

## 🚀 部署指南

### Vercel 部署

1. **后端部署**:
   - 确保 `vercel.json` 配置正确
   - 在 Vercel 中设置环境变量 `GEMINI_API_KEY`
   - 部署后端到 Vercel

2. **前端部署**:
   - 更新前端环境变量中的 API 地址
   - 部署前端到 Vercel

## 🛠️ 开发说明

### 技术选择

- **Google GenAI**: 使用最新的 `@google/genai` 包和 `gemini-2.5-flash-preview-05-20` 模型
- **异步处理**: 采用任务队列模式处理长时间的 AI 分析任务
- **错误处理**: 完善的错误处理和重试机制
- **文件管理**: 支持大文件上传和临时文件清理

### 性能优化

- **文件压缩**: 前端自动压缩视频文件
- **异步处理**: 后端异步处理分析任务
- **状态轮询**: 前端轮询获取分析进度
- **错误重试**: 自动重试失败的请求

## 🔒 安全考虑

- **API Key 安全**: API Key 仅在后端使用，不暴露给前端
- **文件验证**: 严格的文件类型和大小验证
- **临时存储**: 文件存储在临时目录，定期清理
- **错误处理**: 不暴露敏感的系统信息

## 📝 许可证

本项目采用 MIT 许可证。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来改进项目。

## 📞 联系方式

如有问题或建议，请通过 Issue 联系我们。

---

**注意**: 使用本项目需要有效的 Google AI Studio API Key。请确保遵守 Google AI 的使用条款和限制。 