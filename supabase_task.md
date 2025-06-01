# Supabase 整合任务计划

本文档规划了为 `backend` 服务集成 Supabase 关系型数据库以记录每次分析事件的步骤。

## ✅ 完成状态

**已完成的任务：**
- ✅ 安装 Supabase Python 客户端库
- ✅ 创建 Supabase 配置和数据库操作模块 (`supabase.js`)
- ✅ 集成到现有的分析流程中
- ✅ 添加新的 API 路由 (`/api/analysis-history`)
- ✅ 更新环境配置文档
- ✅ 创建数据库表结构 SQL 文件
- ✅ 更新开发文档

## 1. Supabase 项目设置

*   在 Supabase 平台上创建一个新的项目。
*   获取项目的 API 密钥和 URL。这些信息将用于后端服务连接 Supabase。

## 2. 数据库表结构设计

*   **创建 `analysis_events` 表：** 用于存储每一次姿态分析的事件记录。
*   **定义表列：**
    *   `id`: 事件唯一标识符 (UUID, 主键, 自动生成)。
    *   `created_at`: 事件创建时间戳 (Timestamp with timezone, 默认当前时间)。
    *   `r2_video_link`: R2 存储中视频的链接 (TEXT)。
    *   `gemini_file_link`: 上传到 Gemini 的文件链接 (TEXT)。
    *   `analysis_report`: 最终的分析报告 (JSONB)。
    *   `status`: 分析状态 (例如: 'pending', 'processing', 'completed', 'failed') (TEXT)。
    *   `error_message`: 如果分析失败，记录错误信息 (TEXT, 可选)。

## 3. 后端集成 Supabase

*   **安装 Supabase Python 客户端库:**
    ```bash
    pip install supabase
    ```
*   **配置后端连接:**
    *   在后端配置文件中安全地存储 Supabase API 密钥和 URL (例如，使用环境变量)。
    *   初始化 Supabase 客户端。
*   **实现数据库操作函数:**
    *   创建函数用于向 `analysis_events` 表插入新的事件记录。
    *   创建函数用于根据需要更新事件状态或结果。
    *   (可选) 创建函数用于查询分析历史。
*   **修改分析逻辑:**
    *   在分析流程开始时，插入一条初始状态的事件记录。
    *   在分析完成后，更新该事件记录的状态、结果和处理时间。
    *   在分析失败时，更新事件记录的状态和错误信息。

## 4. 测试

*   **单元测试:**
    *   为数据库操作函数编写单元测试，确保数据能正确插入和更新。
*   **集成测试:**
    *   测试整个分析流程，确保事件在 Supabase 中被正确记录。
    *   测试不同分析场景 (成功, 失败, 不同输入类型)。

## 5. 文档

*   更新 `README.md` 或 `DEVELOPMENT.md`，说明新的数据库依赖和配置方法。

## (可选) 6. 安全与优化

*   **行级安全 (RLS):** 根据需要配置 Supabase 的行级安全策略，确保数据访问权限。
*   **数据库索引:** 为经常查询的列 (例如 `created_at`, `status`) 添加索引以优化查询性能。
*   **错误处理和重试机制:** 为数据库操作添加健壮的错误处理和重试逻辑。

## 📋 接下来的步骤

### 1. Supabase 项目配置
1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 创建新项目或选择现有项目
3. 在 SQL Editor 中执行 `backend/supabase_schema.sql` 中的 SQL 语句
4. 在 Settings > API 中获取项目 URL 和 anon key
5. 在 `.env` 文件中配置 Supabase 环境变量

### 2. 测试集成
```bash
# 在 backend 目录下运行测试脚本
node test_supabase.js
```

### 3. 新增的 API 功能
- **GET `/api/analysis-history`**: 获取分析历史记录
- 分析流程现在会自动记录到数据库
- 每个分析事件包含：R2 视频链接、Gemini 文件链接、分析报告

### 4. 数据库表结构
```sql
analysis_events (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP,
    r2_video_link TEXT,
    gemini_file_link TEXT,
    analysis_report JSONB,
    status TEXT,
    error_message TEXT
)
```