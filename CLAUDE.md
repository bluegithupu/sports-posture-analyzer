# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Next.js 的运动姿态分析应用，用户可以上传运动视频，通过 Google Gemini AI 获得姿态分析报告。

## 核心架构

### 技术栈
- **前端**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes
- **AI 分析**: Google Gemini AI (@google/genai)
- **存储**: Cloudflare R2 (视频文件存储)
- **数据库**: Supabase (分析结果和历史记录)
- **测试**: Jest with ts-jest

### 关键架构模式

1. **异步处理模式**: 
   - 视频分析通过 `performAnalysisFromUrl` 函数异步处理
   - 使用内存任务存储 (`lib/store.ts`) 和 Supabase 双重状态管理
   - 前端通过轮询 (`/api/analysis-history`) 获取状态更新

2. **直接上传模式**:
   - 使用 R2 预签名 URL 让客户端直接上传文件
   - 减少服务器带宽压力

3. **状态管理**:
   - 任务状态: pending -> processing -> completed/failed
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
- `app/api/analysis-history/route.ts` - 获取分析历史记录
- `app/api/results/[jobId]/route.ts` - 获取特定任务状态
- `app/api/jobs/[jobId]/retry/route.ts` - 重试失败任务

### 核心库文件
- `lib/genai.ts` - Google Gemini AI 集成和异步分析处理
- `lib/supabaseClient.ts` - Supabase 数据库操作
- `lib/r2Client.ts` - Cloudflare R2 存储操作
- `lib/store.ts` - 内存任务状态管理
- `lib/hooks.ts` - 前端 React hooks

### 页面组件
- `app/page.tsx` - 首页
- `app/video-analysis/page.tsx` - 视频分析页面
- `app/image-analysis/page.tsx` - 图片分析页面
- `app/history/page.tsx` - 历史记录页面

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

## 常见开发任务

- 修改 AI 分析提示词: 编辑 `lib/genai.ts` 中的 prompt 模板
- 添加新的文件类型支持: 更新 `lib/r2Client.ts` 和相关验证逻辑
- 修改 UI 组件: 组件文件位于 `components/` 目录
- 数据库 schema 更改: 需要同步更新 `lib/supabaseClient.ts` 中的类型定义