# 项目重构与 Vercel 部署任务规划

## 1. 目标

- 将现有项目重构为前端 (`front`) 和后端 (`backend`) 分离的架构。
- 后端负责 Gemini AI 的文件处理和姿态分析逻辑，并提供 API 接口。
- 前端负责用户交互、文件上传和展示分析结果。
- 将前端和后端分别部署到 Vercel。

## 2. 后端 (Backend) 开发

- **2.1. 确定 API 接口:**
    - 设计用于文件上传、姿态分析请求和结果获取的 API 接口。
    - 例如:
        - `POST /api/upload`: 上传图片/视频文件。
        - `POST /api/analyze`: 接收文件 ID (或临时文件路径) 和分析参数，触发姿态分析。
        - `GET /api/results/{job_id}`: 获取分析结果。
- **2.2. 搭建后端框架:**
    - 选择合适的后端框架。鉴于 Gemini 通常使用 Python SDK，Python 框架如 Flask 或 FastAPI 会是比较自然的选择。Node.js (如 Express) 也是一个备选项。
    - 初始化后端项目结构。
- **2.3. 迁移 Gemini 逻辑:**
    - 梳理现有项目中与 Gemini AI 交互、文件处理 (如读取、格式转换) 和姿态分析的核心代码。
    - 将这部分逻辑封装成可复用的模块或服务。
    - 实现 API 接口，调用上述模块完成请求处理。
- **2.4. 文件处理与存储:**
    - 后端接收上传的文件后，需要进行临时存储。
    - 考虑 Vercel Serverless Functions 的限制，例如 `/tmp` 目录的大小和生命周期。对于大文件或需要持久化存储的场景，可能需要集成外部存储服务 (如 Vercel Blob, AWS S3, Google Cloud Storage)。
- **2.5. 错误处理与日志:**
    - 实现健壮的错误处理机制。
    - 添加必要的日志记录，方便调试。
- **2.6. Vercel 部署配置 (Backend):**
    - 创建 `vercel.json` 或在项目设置中配置后端服务的构建和运行命令。
    - 配置环境变量 (例如 Gemini API Key)。
    - 如果使用 Python，需要 `requirements.txt`。如果使用 Node.js，需要 `package.json`。

## 3. 前端 (Frontend) 开发

- **3.1. API 集成:**
    - 修改前端代码，使其通过 HTTP 请求调用后端 API，而不是直接执行分析逻辑。
    - 更新文件上传逻辑，将文件发送到后端 `/api/upload`。
    - 发送分析请求到 `/api/analyze`。
    - 通过轮询或使用其他机制 (如 WebSocket) 从 `/api/results/{job_id}` 获取分析结果。
- **3.2. 用户界面调整 (如果需要):**
    - 根据新的异步 API 调用方式，可能需要调整 UI 以提供更好的用户体验 (例如，显示加载状态、进度条)。
- **3.3. Vercel 部署配置 (Frontend):**
    - 前端通常是静态站点或使用 JavaScript 框架 (如 React, Vue, Next.js 等)。
    - Vercel 对这类项目有良好的原生支持。
    - 创建或更新 `vercel.json` (如果需要特定配置，如路由重写)。

## 4. 整体部署与测试

- **4.1. 本地开发与测试:**
    - 在本地分别运行前端和后端服务进行联调测试。
    - 可以使用 Vercel CLI (`vercel dev`) 模拟 Vercel 环境进行本地开发。
- **4.2. Vercel 分别部署:**
    - 将后端代码部署到 Vercel (可能作为 Serverless Functions)。
    - 将前端代码部署到 Vercel。
- **4.3. 配置 API 地址:**
    - 前端需要配置正确的后端 API 地址 (Vercel 部署后生成的 URL)。这通常通过环境变量完成。
- **4.4. 联调测试 (Vercel 环境):**
    - 在 Vercel 部署成功后，进行端到端的测试。
- **4.5. 域名与 HTTPS:**
    - Vercel 自动提供 HTTPS。可以配置自定义域名。

## 5. 代码梳理和定位 (后续步骤)

- **5.1. 搜索 Gemini 相关代码:**
    - 在整个项目中搜索关键词，如 "gemini", "GoogleGenerativeAI", "GenerativeModel", "upload_to_gemini", "generate_content" 等，以定位与 Gemini AI 交互的代码。
- **5.2. 搜索文件处理代码:**
    - 搜索与文件读取、写入、格式转换 (如视频转图片帧) 相关的代码。
    - 关注 `uploads/` 目录的使用方式。
- **5.3. 分析现有项目结构:**
    - 确定当前姿态分析逻辑的入口点和主要流程。
    - 确定哪些部分属于纯前端展示，哪些部分包含核心处理逻辑，需要迁移到后端。

## 6. 注意事项

- **Gemini API Key 管理:** 确保 API Key 安全存储，不要硬编码到代码中，应使用环境变量。
- **Vercel Serverless Functions 限制:**
    - 执行时间限制 (通常几十秒到几分钟，取决于套餐)。长时间运行的分析任务可能需要调整策略 (如分块处理、后台作业队列 + Webhooks 通知)。
    - 内存限制。
    - 包大小限制。
- **异步处理:** 姿态分析可能是耗时操作，后端 API 应设计为异步处理，避免前端长时间等待。前端可以通过轮询或 WebSocket 获取结果。
- **依赖管理:** 后端 (Python/Node.js) 和前端 (JavaScript) 的依赖项需要分别管理 (`requirements.txt`, `package.json`)。

## 7. 初步行动计划

1.  **创建 `task.md` (当前已完成)。**
2.  **分析现有代码库，识别出所有与 Gemini AI 交互以及相关文件处理的逻辑。** (下一步)
3.  **在 `backend` 目录下初始化选定的后端框架 (如 Flask/FastAPI)。**
4.  **开始设计并实现 `/api/upload` 接口。**
5.  **逐步将识别出的 Gemini 和文件处理逻辑迁移到后端服务中，并实现 `/api/analyze` 和 `/api/results/{job_id}` 接口。**
6.  **修改 `front` 部分代码，使其调用新的后端 API。**
7.  **配置 Vercel 进行部署。** 