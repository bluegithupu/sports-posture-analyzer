# Next.js 项目重构任务清单

本文档根据 `nextjs_refact_design.md` 将项目重构工作拆分为具体的可执行任务。

## 阶段 0: 准备工作

- [x] **详细代码审查**: 仔细审查 `front/` 和 `backend/` 的现有代码，全面了解所有功能点、数据流、特殊逻辑和第三方服务集成细节。
    - [x] 前端代码审查 (`front/`)
    - [x] 后端代码审查 (`backend/`)
- [x] **团队技术栈评估**: 确保团队成员具备或能够快速学习 Next.js (App Router)、TypeScript 及相关生态知识。
- [x] **备份现有项目**: 在开始任何迁移工作前，完整备份当前的 `front` 和 `backend` 项目。
- [x] **版本控制**: 确认新的 Next.js 项目将使用 Git 进行版本控制，并规划好分支策略 (例如 `main`, `develop`, `feature/xxx`)。

## 阶段 1: 初始化和基础设置 (预估: 1-2 天) ✅

- [x] **创建 Next.js 项目**:
    - [x] 执行 `npx create-next-app@latest nextjs-sports-analyzer --typescript --eslint --tailwind --app` (根据需要调整选项，如 `--src-dir`)。
    - [x] `cd nextjs-sports-analyzer` 进入项目目录。
- [x] **配置基本项目结构**:
    - [x] 创建 `components/` 目录。
    - [x] 创建 `lib/` 目录。
    - [x] 检查 `app/layout.tsx` 和 `app/page.tsx` 默认文件。
- [x] **依赖合并与安装**:
    - [x] 梳理 `front/package.json` 和 `backend/package.json` 中的所有依赖项。
    - [x] 在新的 Next.js 项目 `package.json` 中添加必要的依赖:
        - [x] `@google/genai`
        - [x] `@supabase/supabase-js`
        - [x] `aws-sdk` (for R2)
        - [x] `react-markdown`
        - [x] `uuid`
        - [x] 其他必要的 UI 库或工具库。
    - [x] 移除不再需要的依赖 (e.g., `vite`, `express`, `nodemon`, `react-router-dom` - 大部分功能会被 Next.js 取代)。
    - [x] 运行 `npm install` (或 `yarn install`) 安装依赖。
- [x] **配置 TypeScript**: 检查并根据需要调整 `tsconfig.json`。
- [x] **配置 ESLint**: 检查并根据需要调整 `.eslintrc.json`。
- [x] **配置 Tailwind CSS (如果选择使用)**: 确保 `tailwind.config.js` 和 `postcss.config.js` (或 `tailwind.config.ts`) 配置正确，并将 Tailwind 指令添加到 `app/global.css`。
- [x] **环境变量设置 (`.env.local`)**:
    - [x] 创建 `.env.local` 文件。
    - [x] 收集所有前端和后端所需的环境变量。
    - [x] 添加 Supabase 相关环境变量 (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)。
    - [x] 添加 R2 (AWS SDK) 相关环境变量 (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL_BASE` (如果需要))。
    - [x] 添加 GenAI API 密钥等。
    - [x] 区分服务器端变量和客户端变量 (以 `NEXT_PUBLIC_` 开头的)。
- [x] **初始化 `lib/` 目录中的客户端**:
    - [x] 创建 `lib/supabaseClient.ts` 并初始化 Supabase 客户端。
    - [x] 创建 `lib/r2Client.ts` 并配置 AWS S3 客户端用于 R2。
    - [x] 创建 `lib/genai.ts` 并初始化 GenAI 客户端。

## 阶段 2: 前端组件和页面迁移 (预估: 3-5 天) ✅

- [x] **核心布局迁移**:
    - [x] 将 `front/App.tsx` (或等效的根组件) 中的主要布局结构迁移到 `app/layout.tsx`。
    - [x] 设置全局样式 `app/global.css`。
- [x] **组件迁移 (`components/`)**:
    - [x] 将 `front/components/` 下的所有 React 组件复制到新项目的 `components/` 目录。
    - [x] **逐个审查和调整组件**:
        - [x] 更新导入路径。
        - [x] 识别需要客户端交互的组件，并在文件顶部添加 `"use client";` 指令。
        - [x] 检查样式是否正确应用 (CSS Modules, Tailwind CSS 等)。
        - [x] 确保与 React 19 和 Next.js 的兼容性。
- [x] **页面和路由迁移 (`app/`)**:
    - [x] 根据原 `react-router-dom` 配置，在 `app/` 目录下创建对应的文件夹结构和 `page.tsx` 文件。
        - [x] **示例**: `/` -> `app/page.tsx` (主页)
        - [x] **示例**: `/history` -> `app/history/page.tsx` (历史记录页)
    - [x] **逐个页面迁移内容**:
        - [x] 将原页面组件的内容迁移到对应的 `page.tsx`。
        - [x] 替换 `react-router-dom` 的 `<Link>` 为 Next.js 的 `<Link href="...">`。
        - [x] 替换 `useHistory` / `useNavigate` 为 Next.js 的 `useRouter` hook (来自 `next/navigation`)。
        - [x] 移除旧的路由定义代码 (`<Route>`, `<Switch>`, `<BrowserRouter>`)。
    - [x] **处理嵌套路由和布局**: 使用 Next.js 的文件夹嵌套和 `layout.tsx` 文件实现。
- [x] **静态资源迁移 (`public/`)**:
    - [x] 将 `front/public/` (或 `assets/`) 中的图片、字体等静态资源移动到 Next.js 项目的 `public/` 目录。
    - [x] 更新代码中对这些资源的引用路径 (e.g., `/image.png` 而不是 `public/image.png`)。
    - [x] 对于 Next.js 的 `<Image>` 组件优化，考虑其使用。
- [x] **样式迁移**:
    - [x] 如果有全局样式，合并到 `app/global.css`。
    - [x] 确保 CSS Modules 文件 (`*.module.css`) 正常工作。
    - [x] 适配或重写使用 Tailwind CSS 的样式。
- [x] **前端环境变量使用**:
    - [x] 确保客户端代码中正确使用以 `NEXT_PUBLIC_` 为前缀的环境变量。

## 阶段 3: 后端 API 逻辑迁移 (`app/api/`) (预估: 4-7 天) ✅

- [x] **API 路由规划**:
    - [x] 列出 `backend/server.js` 中的所有 Express API 端点。
    - [x] 规划 Next.js 中对应的 `app/api/.../route.ts` 结构。
- [x] **逐个 API 端点迁移**:
    - [x] 对于每个 Express 路由:
        - [x] 在 `app/api/` 目录下创建相应的 `route.ts` 文件。
        - [x] 迁移路由处理函数逻辑。
        - [x] 将 Express `req`, `res` 对象的使用改为 `NextRequest`, `NextResponse`。
        - [x] **已完成的 API 端点**:
            - [x] `POST /api/generate-upload-url` -> `app/api/generate-upload-url/route.ts`
            - [x] `POST /api/submit-video-url` -> `app/api/submit-video-url/route.ts`
            - [x] `GET /api/results/[jobId]` -> `app/api/results/[jobId]/route.ts`
            - [x] `GET /api/analysis-history` -> `app/api/analysis-history/route.ts`
            - [x] `POST /api/jobs/[jobId]/retry` -> `app/api/jobs/[jobId]/retry/route.ts`
- [x] **Supabase 交互迁移**:
    - [x] 在 API 路由中导入并使用 `lib/supabaseClient.ts`。
    - [x] 迁移所有数据库的 CRUD 操作。
- [x] **Cloudflare R2 (AWS SDK) 交互迁移**:
    - [x] 在 API 路由中导入并使用 AWS SDK v3 进行 R2 操作。
    - [x] 迁移预签名 URL 生成、文件上传等操作。
- [x] **`@google/genai` 交互迁移**:
    - [x] 在 API 路由中导入并使用 `lib/genai.ts`。
    - [x] 迁移所有与 GenAI 相关的逻辑。
- [x] **文件上传处理**:
    - [x] **设计文件上传 API**: 实现 R2 预签名 URL 生成。
    - [x] 实现前端直接上传到 R2 的流程。
    - [x] 更新前端代码，使其使用新的 Next.js API 端点。
- [x] **认证和授权逻辑 (如果存在)**:
    - [x] 审查原有的认证机制。
    - [x] 迁移或重新实现认证逻辑在 API 路由中 (使用 Supabase)。
- [x] **错误处理**:
    - [x] 实现统一的错误处理机制，使用 `NextResponse.json({ error: ... }, { status: ... })`。
- [x] **CORS 配置 (如果仍然需要)**:
    - [x] 检查 `next.config.mjs` 中的 `headers` 配置，或在 API 路由中按需设置响应头。 (由于是同源，大部分情况不需要特殊配置)
- [x] **请求校验 (如果需要)**:
    - [x] 考虑使用 Zod 或类似库对 API 请求体和参数进行校验。

## 阶段 4: 数据获取和状态管理调整 (预估: 2-3 天) ✅

- [x] **Server Components 数据获取**:
    - [x] 识别可以在服务器端获取数据的页面/组件。
    - [x] 在 `page.tsx` 或 Server Components 中使用 `async/await` 直接获取数据 (调用内部 API 路由或直接与 `lib/` 中的服务交互)。
- [x] **Client Components 数据获取**:
    - [x] 对于需要在客户端进行数据获取的组件 (标记为 `"use client";`)：
        - [x] 使用 `useEffect` 和 `fetch` 调用 API 路由。
        - [x] 创建了统一的 API 客户端 (`lib/apiClient.ts`) 进行类型安全的数据获取。
        - [x] 创建了自定义 Hooks (`lib/hooks.ts`) 封装数据获取逻辑：
            - [x] `useAnalysisHistory` - 分析历史数据获取
            - [x] `useJobPolling` - 任务结果轮询
            - [x] `useVideoAnalysis` - 视频上传和分析
            - [x] `useJobRetry` - 任务重试
- [x] **状态管理审视和调整**:
    - [x] 评估当前状态管理方案 (React Context, props drilling)。
    - [x] 创建了轻量级状态管理系统 (`lib/store.ts`) 使用 React Context + useReducer。
    - [x] 创建了通知系统组件 (`components/NotificationSystem.tsx`)。
    - [x] 迁移或重构现有状态管理逻辑以适应 Next.js 架构。
- [x] **表单处理**:
    - [x] 确保所有表单提交都指向新的 Next.js API 路由。
    - [x] 处理表单状态、校验和提交逻辑。
- [x] **组件优化**:
    - [x] 更新 `HomePage.tsx` 使用新的 API 客户端和 Hooks
    - [x] 更新 `AnalysisHistory.tsx` 使用新的 API 客户端和 Hooks
    - [x] 简化组件逻辑，提高代码可维护性

## 阶段 5: 测试和调试 (预估: 3-5 天)

- [ ] **单元测试**:
    - [ ] 为关键组件和 `lib/` 中的工具函数编写/迁移单元测试 (使用 Jest, Vitest 等)。
- [ ] **API 路由测试**:
    - [ ] 测试所有 API 路由的功能、参数处理和错误响应 (可以使用 Postman 或编写集成测试)。
- [ ] **集成测试**:
    - [ ] 测试前端组件与 API 路由的交互。
- [ ] **端到端 (E2E) 测试**:
    - [ ] 编写/迁移 E2E 测试用例覆盖主要用户流程 (使用 Playwright, Cypress 等)。
- [ ] **跨浏览器测试**:
    - [ ] 在主流浏览器上测试应用功能和兼容性。
- [ ] **响应式设计测试**:
    - [ ] 在不同设备尺寸上测试应用的响应式布局。
- [ ] **性能初步评估**:
    - [ ] 使用 Lighthouse 或 Next.js Analyzers 检查初步性能指标。
- [ ] **Bug 修复**:
    - [ ] 根据测试结果进行全面的 Bug 修复。

## 阶段 6: 部署和优化 (预估: 1-2 天)

- [ ] **Vercel 部署配置**:
    - [ ] 将 Next.js 项目连接到 Vercel 账户 (通过 Git 仓库)。
    - [ ] 在 Vercel 项目设置中配置所有必要的环境变量。
    - [ ] 触发首次部署并验证。
- [ ] **生产环境构建和测试**:
    - [ ] 确保 `next build` 成功。
    - [ ] 在 Vercel 的预览环境或临时生产环境中进行最终测试。
- [ ] **域名和 DNS 配置**:
    - [ ] 将域名指向 Vercel部署的应用。
- [ ] **性能优化**:
    - [ ] 使用 Next.js `<Image>` 组件优化图片加载。
    - [ ] 使用 Next.js `<Script>` 组件优化第三方脚本加载。
    - [ ] 代码分割 (Next.js 自动处理大部分)。
    - [ ] 利用 Vercel 的 CDN 和缓存机制。
    - [ ] 分析 Bundle 大小并进行优化。
- [ ] **监控和日志**:
    - [ ] (可选) 集成 Vercel Analytics 或其他监控服务。
    - [ ] 检查 Vercel 运行时日志。

## 阶段 7: 后续步骤和文档更新

- [ ] **试点迁移 (如果之前未做)**:
    - [ ] 如果在详细迁移前未进行试点，此时可以选择一个小功能模块，完整走通从开发到部署的流程，以验证整体方案。
- [ ] **文档更新**:
    - [ ] 更新项目 `README.md` 以反映新的技术栈和启动、部署说明。
    - [ ] 编写或更新开发者文档。
- [ ] **代码清理和重构**:
    - [ ] 移除迁移过程中产生的无用代码或注释。
    - [ ] 根据实际运行情况进行必要的代码重构。
- [ ] **知识分享**:
    - [ ] 向团队成员分享 Next.js 的最佳实践和项目经验。

---
**注意**: 这是一个动态的任务列表，在迁移过程中可能会根据实际情况进行调整、添加或删除任务。务必保持良好的沟通和记录。 