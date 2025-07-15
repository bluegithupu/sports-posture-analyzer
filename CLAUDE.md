# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Next.js 的运动姿态分析应用，支持三种核心功能：
1. **图片分析**: 上传运动图片获得专业的姿态分析报告
2. **视频分析**: 上传运动视频进行动态姿态评估  
3. **实时教练**: 通过摄像头和麦克风与 AI 健身教练实时交流

## 核心架构

### 技术栈
- **前端**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes
- **AI 分析**: Google Gemini AI (@google/genai)
- **实时交互**: Google Gemini Live API
- **存储**: Cloudflare R2 (视频文件存储)
- **数据库**: Supabase (分析结果和历史记录)
- **实时通信**: Server-Sent Events (SSE)
- **测试**: Jest with ts-jest

### 关键架构模式

1. **异步处理模式**: 
   - 视频分析通过 `performAnalysisFromUrl` 函数异步处理
   - 使用内存任务存储 (`lib/store.ts`) 和 Supabase 双重状态管理
   - 前端通过轮询 (`/api/analysis-history`) 获取状态更新

2. **直接上传模式**:
   - 使用 R2 预签名 URL 让客户端直接上传文件
   - 减少服务器带宽压力

3. **实时交互模式**:
   - 使用 Gemini Live API 进行实时语音和视频交互
   - 通过 Server-Sent Events (SSE) 实现服务器到客户端的实时消息推送
   - 支持双向音视频通信和文本交流

4. **状态管理**:
   - 任务状态: pending -> processing -> completed/failed
   - 实时会话状态: connecting -> connected -> disconnected
   - 内存存储提供实时状态，数据库存储持久化数据

## 开发命令

```bash
# 开发环境
npm run dev

# 构建 (包含 lint 检查)
npm run build

# 代码检查
npm run lint

# 测试
npm test
npm run test:watch
npm run test:coverage
```

## 核心文件结构

### API 路由
- `app/api/generate-upload-url/route.ts` - 生成 R2 预签名上传 URL
- `app/api/submit-video-url/route.ts` - 提交视频分析任务
- `app/api/submit-images/route.ts` - 提交图片分析任务
- `app/api/analysis-history/route.ts` - 获取分析历史记录
- `app/api/results/[jobId]/route.ts` - 获取特定任务状态
- `app/api/jobs/[jobId]/retry/route.ts` - 重试失败任务
- `app/api/live-session/route.ts` - 实时教练会话管理
- `app/api/live-session/sse/route.ts` - 实时消息推送 (SSE)

### 核心库文件
- `lib/genai.ts` - Google Gemini AI 集成和异步分析处理
- `lib/geminiLive.ts` - Gemini Live API 实时交互封装
- `lib/sseManager.ts` - Server-Sent Events 连接管理
- `lib/supabaseClient.ts` - Supabase 数据库操作
- `lib/r2Client.ts` - Cloudflare R2 存储操作
- `lib/store.ts` - 内存任务状态管理
- `lib/hooks.ts` - 前端 React hooks
- `lib/apiClient.ts` - 统一的 API 客户端

### 页面组件
- `app/page.tsx` - 首页 (图片分析)
- `app/video-analysis/page.tsx` - 视频分析页面
- `app/image-analysis/page.tsx` - 图片分析页面
- `app/live-coach/page.tsx` - 实时教练页面
- `app/history/page.tsx` - 历史记录页面

### 主要 React 组件
- `components/ImageAnalysisPage.tsx` - 图片分析主组件
- `components/LiveCoachPage.tsx` - 实时教练主组件
- `components/AnalysisHistory.tsx` - 历史记录组件
- `components/Navigation.tsx` - 导航栏组件

## 环境变量配置

项目需要以下环境变量：

```bash
# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash  # 可选，默认值

# Cloudflare R2
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_ACCOUNT_ID=your_account_id
R2_PUBLIC_URL_BASE=your_public_url_base  # 可选

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 测试配置

- 测试文件位于 `__tests__/` 目录
- 使用 Jest 和 ts-jest 进行测试
- 测试超时时间设置为 30 秒
- 支持测试覆盖率报告

## 开发注意事项

1. **错误处理**: 所有 API 都有完善的错误处理和日志记录
2. **状态同步**: 内存状态和数据库状态需要保持同步
3. **文件清理**: 临时文件会在分析完成后自动清理
4. **国际化**: 界面使用中文，但代码注释和变量名使用英文
5. **移动响应式**: 支持移动设备的响应式设计
6. **实时通信**: Gemini Live 仅支持英文语音，但 AI 可理解中英文文本输入
7. **媒体权限**: 实时教练功能需要用户授权摄像头和麦克风权限

## 实时教练功能详解

### 技术实现
- **Gemini Live API**: 使用 `gemini-live-2.5-flash-preview` 模型
- **语言支持**: 英文语音交互，支持中英文文本理解
- **实时通信**: Server-Sent Events 推送 AI 响应到客户端
- **媒体流**: WebRTC 技术捕获摄像头和麦克风数据

### 使用流程
1. 用户访问 `/live-coach` 页面
2. 点击"开始训练"按钮
3. 授权摄像头和麦克风权限
4. 系统建立 SSE 连接和 Gemini Live 会话
5. 用户可通过语音或快捷按钮与 AI 教练交流
6. AI 教练提供实时的健身指导和建议

### 开发要点
- 会话状态管理: `lib/geminiLive.ts`
- SSE 消息推送: `lib/sseManager.ts`
- 前端实时界面: `components/LiveCoachPage.tsx`
- 中英文消息转换: 快捷按钮自动翻译

## 常见开发任务

- 修改 AI 分析提示词: 编辑 `lib/genai.ts` 中的 prompt 模板
- 修改实时教练人格: 编辑 `lib/geminiLive.ts` 中的 `setCoachPersonality` 方法
- 添加新的文件类型支持: 更新 `lib/r2Client.ts` 和相关验证逻辑
- 修改 UI 组件: 组件文件位于 `components/` 目录
- 数据库 schema 更改: 需要同步更新 `lib/supabaseClient.ts` 中的类型定义
- 添加新的快捷消息: 更新 `components/LiveCoachPage.tsx` 中的快捷按钮配置

## 故障排除

### 实时教练相关问题
1. **语音不工作**: 检查浏览器是否支持 WebRTC，确认麦克风权限
2. **AI 不回复**: 检查 Gemini API 密钥，查看 SSE 连接状态
3. **连接失败**: 检查网络连接，确认 Gemini Live 服务可用性
4. **摄像头无法打开**: 确认浏览器权限，检查是否被其他应用占用

### 常用调试命令
```bash
# 查看 SSE 连接状态
curl -N http://localhost:3000/api/live-session/sse?sessionId=test

# 检查 API 密钥配置
npm run dev # 查看控制台输出

# 运行诊断工具
curl http://localhost:3000/api/diagnose
```

## 重要提醒

### API 密钥安全
- 所有 API 密钥都存储在 `.env.local` 文件中
- 绝不要将 API 密钥提交到版本控制系统
- 生产环境使用环境变量或安全的密钥管理服务

### 浏览器兼容性
- 实时教练功能需要现代浏览器支持 (Chrome 88+, Firefox 90+, Safari 14+)
- 移动设备需要 HTTPS 才能访问摄像头和麦克风
- iOS Safari 对 WebRTC 支持有限，建议使用 Chrome

### 性能优化
- 实时视频流每 2 秒发送一帧到 AI 进行分析
- 可在 `components/LiveCoachPage.tsx` 中调整发送频率
- 大文件上传使用分片上传技术优化

### 示例文件
- `examples/video_live_exsample.ts` - Gemini Live API 的原始示例代码
- 此文件已从构建过程中排除，仅作参考使用