# 开发文档 (Development Guide)

## 📋 目录

- [项目架构](#项目架构)
- [开发环境设置](#开发环境设置)
- [代码结构](#代码结构)
- [API 设计](#api-设计)
- [前端开发](#前端开发)
- [后端开发](#后端开发)
- [测试指南](#测试指南)
- [部署流程](#部署流程)
- [故障排除](#故障排除)

## 🏗️ 项目架构

### 整体架构图

```
┌─────────────────┐    HTTP/HTTPS    ┌─────────────────┐
│                 │ ──────────────── │                 │
│   前端 (React)   │                  │  后端 (Node.js)  │
│                 │ ←──────────────── │                 │
└─────────────────┘                  └─────────────────┘
                                              │
                                              │ API 调用
                                              ▼
                                    ┌─────────────────┐
                                    │                 │
                                    │  Google GenAI   │
                                    │                 │
                                    └─────────────────┘
```

### 技术栈详情

#### 前端技术栈
- **React 18**: 用户界面框架
- **TypeScript**: 类型安全的 JavaScript
- **Vite**: 快速的构建工具
- **CSS3**: 样式设计
- **Fetch API**: HTTP 请求

#### 后端技术栈
- **Node.js**: JavaScript 运行时
- **Express.js**: Web 框架
- **@google/genai**: Google AI SDK
- **Multer**: 文件上传中间件
- **@supabase/supabase-js**: Supabase 数据库客户端
- **dotenv**: 环境变量管理
- **uuid**: 唯一标识符生成

## 🛠️ 开发环境设置

### 系统要求

- **Node.js**: 16.0.0 或更高版本
- **npm**: 7.0.0 或更高版本
- **操作系统**: Windows 10+, macOS 10.15+, Ubuntu 18.04+

### 详细安装步骤

1. **安装 Node.js**
   ```bash
   # 使用 nvm (推荐)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   
   # 或直接从官网下载
   # https://nodejs.org/
   ```

2. **克隆项目**
   ```bash
   git clone <repository-url>
   cd sports-posture-analyzer
   ```

3. **后端设置**
   ```bash
   cd backend
   npm install
   
   # 创建环境变量文件
   touch .env
   echo "GEMINI_API_KEY=your_api_key_here" > .env
   echo "SUPABASE_URL=your_supabase_project_url" >> .env
   echo "SUPABASE_ANON_KEY=your_supabase_anon_key" >> .env
   ```

4. **前端设置**
   ```bash
   cd ../front
   npm install
   
   # 创建环境变量文件
   touch .env
   echo "VITE_API_BASE_URL=http://localhost:5002/api" > .env
   ```

5. **Supabase 数据库设置**
   ```bash
   # 在 Supabase 控制台中执行 SQL
   # 使用 backend/supabase_schema.sql 中的 SQL 语句创建表结构
   
   # 获取 Supabase 项目信息
   # 1. 访问 https://supabase.com/dashboard
   # 2. 创建新项目或选择现有项目
   # 3. 在 Settings > API 中获取 URL 和 anon key
   # 4. 在 SQL Editor 中执行 supabase_schema.sql 的内容
   ```

## 📁 代码结构

### 后端结构详解

```
backend/
├── server.js              # 主服务器文件
├── supabase.js            # Supabase 数据库操作模块
├── supabase_schema.sql    # 数据库表结构 SQL
├── package.json           # 依赖和脚本配置
├── vercel.json            # Vercel 部署配置
├── .env                   # 环境变量 (不提交到 git)
├── .gitignore             # Git 忽略文件
└── env-config.md          # 环境变量配置说明
```

#### server.js 核心模块

```javascript
// 主要模块
const express = require('express');           // Web 框架
const multer = require('multer');            // 文件上传
const { GoogleGenAI } = require('@google/genai'); // AI SDK

// 核心功能
- 文件上传处理 (upload middleware)
- AI 分析任务管理 (performAnalysis)
- 异步任务状态跟踪 (analysisJobs)
- 错误处理和重试机制
```

### 前端结构详解

```
front/
├── src/
│   ├── App.tsx            # 主应用组件
│   ├── main.tsx           # 应用入口点
│   └── vite-env.d.ts      # TypeScript 类型定义
├── components/            # 可复用组件
├── config/                # 配置文件
├── report/                # 报告相关文件
├── uploads/               # 本地上传文件 (开发用)
├── utils/                 # 工具函数
├── package.json           # 前端依赖
├── vite.config.ts         # Vite 配置
├── tsconfig.json          # TypeScript 配置
└── .env                   # 前端环境变量
```

## 🔌 API 设计

### RESTful API 规范

#### 基础 URL
- **开发环境**: `http://localhost:5002/api`
- **生产环境**: `https://your-domain.vercel.app/api`

#### 端点详情

##### 1. 健康检查
```http
GET /
GET /api/hello
```

##### 2. 文件上传
```http
POST /api/upload
Content-Type: multipart/form-data
```

**请求体:**
```
file: <video file>
```

**响应:**
```json
{
  "message": "File uploaded successfully",
  "file_id": "uuid-filename.mp4",
  "original_filename": "original.mp4", 
  "mimetype": "video/mp4",
  "size": 5654189,
  "saved_path_debug": "/tmp/uploads_nodejs/uuid-filename.mp4"
}
```

##### 3. 开始分析
```http
POST /api/analyze
Content-Type: application/json
```

**请求体:**
```json
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

##### 4. 查询结果
```http
GET /api/results/{job_id}
```

**状态响应:**
```json
// 等待中
{
  "status": "pending",
  "message": "Analysis request received."
}

// 处理中
{
  "status": "processing", 
  "message": "File uploaded. Starting AI analysis..."
}

// 完成
{
  "status": "completed",
  "report": "详细的分析报告..."
}

// 失败
{
  "status": "failed",
  "error": "错误描述"
}
```

##### 5. 分析历史记录
```http
GET /api/analysis-history?limit=10
```

**响应:**
```json
{
  "message": "Analysis history retrieved successfully.",
  "data": [
    {
      "id": "uuid",
      "created_at": "2024-01-01T00:00:00Z",
      "r2_video_link": "https://r2.example.com/video.mp4",
      "gemini_file_link": "https://generativelanguage.googleapis.com/v1beta/files/...",
      "analysis_report": {
        "text": "分析报告内容...",
        "timestamp": "2024-01-01T00:00:00Z",
        "model_used": "gemini-2.5-flash-preview-05-20"
      },
      "status": "completed",
      "error_message": null
    }
  ],
  "count": 1
}
```

## 🎨 前端开发

### 组件架构

#### App.tsx 主要功能
```typescript
interface AppState {
  selectedFile: File | null;
  isAnalyzing: boolean;
  analysisResult: string | null;
  error: string | null;
  uploadProgress: number;
}

// 主要方法
- handleFileSelect()      // 文件选择
- compressVideo()         // 视频压缩
- handleAnalyzeVideo()    // 开始分析
- pollForResult()         // 轮询结果
```

### 状态管理

使用 React Hooks 进行状态管理：

```typescript
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [analysisResult, setAnalysisResult] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);
```

### 文件处理

#### 视频压缩逻辑
```typescript
const compressVideo = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 压缩逻辑...
  });
};
```

## ⚙️ 后端开发

### 核心模块

#### 1. 文件上传处理
```javascript
const storage = multer.diskStorage({
  destination: '/tmp/uploads_nodejs',
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    cb(null, `${uuidv4()}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', ...];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});
```

#### 2. AI 分析流程
```javascript
async function performAnalysis(jobId, localFilePath, originalFilename, mimeType) {
  try {
    // 1. 上传文件到 Google AI
    const uploadedFile = await ai.files.upload({
      file: localFilePath,
      config: { mimeType, displayName: originalFilename }
    });
    
    // 2. 等待文件处理完成
    let fileInfo = uploadedFile;
    while (fileInfo.state !== 'ACTIVE') {
      await new Promise(resolve => setTimeout(resolve, 10000));
      fileInfo = await ai.files.get({ name: uploadedFile.name });
    }
    
    // 3. 调用 AI 模型分析
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: createUserContent([
        createPartFromUri(fileInfo.uri, fileInfo.mimeType),
        prompt
      ])
    });
    
    // 4. 保存结果
    analysisJobs[jobId] = { 
      status: 'completed', 
      report: response.text 
    };
    
  } catch (error) {
    analysisJobs[jobId] = { 
      status: 'failed', 
      error: error.message 
    };
  }
}
```

#### 3. 错误处理策略
```javascript
// 网络错误重试
if (error.message.includes('429')) {
  console.log('Quota exceeded, waiting 30 seconds...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  // 重试逻辑
}

// 文件状态检查
if (fileInfo.state !== 'ACTIVE') {
  console.log('File state uncertain, attempting to proceed...');
  fileInfo = uploadedFile; // 使用原始信息
}
```

## 🧪 测试指南

### 手动测试流程

#### 1. 后端 API 测试
```bash
# 测试健康检查
curl http://localhost:5002/api/hello

# 测试文件上传
curl -X POST -F "file=@test-video.mp4" http://localhost:5002/api/upload

# 测试分析启动
curl -X POST -H "Content-Type: application/json" \
  -d '{"file_id":"test.mp4","original_filename":"test.mp4","mimetype":"video/mp4"}' \
  http://localhost:5002/api/analyze

# 测试结果查询
curl http://localhost:5002/api/results/{job_id}
```

#### 2. 前端功能测试
- [ ] 文件选择功能
- [ ] 文件大小验证
- [ ] 文件类型验证
- [ ] 上传进度显示
- [ ] 分析状态更新
- [ ] 结果展示
- [ ] 错误处理

### 性能测试

#### 文件大小测试
- 小文件 (< 10MB): 应在 30 秒内完成
- 中等文件 (10-100MB): 应在 2 分钟内完成
- 大文件 (100-500MB): 应在 5 分钟内完成

## 🚀 部署流程

### Vercel 部署步骤

#### 1. 后端部署
```bash
# 确保 vercel.json 配置正确
{
  "functions": {
    "server.js": {
      "maxDuration": 300
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/server.js"
    }
  ]
}

# 部署命令
vercel --prod
```

#### 2. 环境变量设置
```bash
# 在 Vercel Dashboard 中设置
GEMINI_API_KEY=your_actual_api_key
```

#### 3. 前端部署
```bash
# 更新生产环境 API 地址
VITE_API_BASE_URL=https://your-backend.vercel.app/api

# 部署
vercel --prod
```

## 🔧 故障排除

### 常见问题

#### 1. API Key 相关
```
错误: "API key not configured"
解决: 检查 .env 文件中的 GEMINI_API_KEY 设置
```

#### 2. 文件上传失败
```
错误: "File upload error: File too large"
解决: 检查文件大小限制 (500MB)
```

#### 3. AI 分析失败
```
错误: "got status: 429 Too Many Requests"
解决: API 配额用完，等待重置或升级计划
```

#### 4. 文件处理超时
```
错误: "File processing failed or timed out"
解决: 文件可能太大或格式不支持，尝试压缩或转换格式
```

### 调试技巧

#### 1. 后端日志
```bash
# 查看实时日志
tail -f server.log

# 查看特定任务日志
grep "Job {job_id}" server.log
```

#### 2. 前端调试
```javascript
// 在浏览器控制台中
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
console.log('Selected file:', selectedFile);
```

#### 3. 网络调试
- 使用浏览器开发者工具的 Network 标签
- 检查请求和响应状态
- 验证请求头和请求体

### 性能优化建议

1. **文件压缩**: 在前端压缩视频文件
2. **缓存策略**: 实现结果缓存机制
3. **并发控制**: 限制同时处理的任务数量
4. **资源清理**: 定期清理临时文件

---

## 📚 参考资料

- [Google GenAI 文档](https://ai.google.dev/docs)
- [Express.js 文档](https://expressjs.com/)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)
- [Vercel 部署指南](https://vercel.com/docs) 