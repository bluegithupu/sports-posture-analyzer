# Next.js 项目重构设计文档

## 1. 引言

本文档旨在为将现有的前后端分离项目（基于 React/Vite 前端和 Node.js/Express 后端）重构为一个统一的 Next.js 项目提供设计方案和迁移指南。Next.js 提供了强大的功能，如服务端渲染 (SSR)、静态站点生成 (SSG)、API 路由、优化的图片处理等，能够简化开发工作流、提升应用性能和改善开发者体验。通过此次重构，旨在利用 Next.js 的这些优势，整合前后端代码库，实现更高效的开发和部署。

## 2. 当前架构回顾

当前项目采用前后端分离架构：

*   **前端 (`front/`)**:
    *   技术栈：React (v19), TypeScript, Vite
    *   路由：`react-router-dom`
    *   UI 组件：自定义组件，`react-markdown`
    *   状态管理：可能通过 React Context 或 props 传递
    *   API 通信：通过 `fetch` 或类似 HTTP客户端与后端 API 交互
    *   特定库：`@google/genai`

*   **后端 (`backend/`)**:
    *   技术栈：Node.js, Express.js
    *   数据库/服务：Supabase (通过 `supabase-js` 客户端)
    *   文件存储：Cloudflare R2 (通过 `aws-sdk` 客户端，因为 R2 兼容 S3 API)
    *   API：RESTful API，使用 Multer 处理文件上传
    *   特定库：`@google/genai`

*   **部署**: 目前前端和后端分别部署。

## 3. Next.js 项目结构建议

建议采用 Next.js 的 App Router 模型，其核心目录结构如下：

```
nextjs-sports-analyzer/
├── app/                            # App Router 核心目录
│   ├── layout.tsx                  # 根布局
│   ├── page.tsx                    # 根页面 (例如首页)
│   ├── global.css                  # 全局样式
│   │
│   ├── (dashboard)/                # 路由组 (示例，可根据实际页面组织)
│   │   ├── layout.tsx              # dashboard 布局
│   │   ├── settings/
│   │   │   └── page.tsx            # /dashboard/settings 页面
│   │   └── page.tsx                # /dashboard 页面
│   │
│   ├── api/                        # API 路由
│   │   ├── auth/                   # 认证相关 API (示例)
│   │   │   └── route.ts
│   │   ├── upload/                 # 文件上传 API
│   │   │   └── route.ts
│   │   └── [entity]/               # 动态 API 路由 (示例)
│   │       └── [id]/
│   │           └── route.ts
│   │
│   └── ...                         # 其他页面和路由
│
├── components/                     # UI 组件 (共享)
│   ├── ui/                         # 基础 UI 组件 (按钮、输入框等)
│   ├── specific-feature/           # 特定功能的组件
│   └── ...
│
├── lib/                            # 工具函数、第三方服务客户端初始化等
│   ├── supabaseClient.ts
│   ├── r2Client.ts
│   ├── genai.ts
│   └── utils.ts
│
├── public/                         # 静态资源 (图片, favicon.ico 等)
│
├── .env.local                      # 环境变量 (本地开发，不提交到 Git)
├── .eslintrc.json
├── next.config.mjs                 # Next.js 配置文件
├── package.json
├── tsconfig.json
└── README.md
```

**关键点**:

*   **`app/`**: 包含所有页面、布局和 API 路由。使用文件夹结构定义路由。
*   **`app/layout.tsx`**: 定义全局布局，所有页面共享。
*   **`app/page.tsx`**: 对应于网站的根路径 (`/`)。
*   **`app/api/`**: Next.js API 路由，用于替代原有的 Express 后端。每个 `route.ts` (或 `.js`) 文件导出的函数 (e.g., `GET`, `POST`) 对应 HTTP 方法。
*   **`components/`**: 存放可复用的 React 组件。可以进一步划分子目录。
*   **`lib/`**: 存放辅助函数、常量、类型定义以及第三方服务（如 Supabase, R2, GenAI）的初始化和配置代码。
*   **`public/`**: 存放静态文件，可以直接通过根路径访问 (例如 `/image.png` 对应 `public/image.png`)。

## 4. 迁移步骤

### 4.1. 初始化 Next.js 项目

1.  **创建新项目**:
    ```bash
    npx create-next-app@latest nextjs-sports-analyzer --typescript --eslint --tailwind (可选) --src-dir (如果想用src目录) --app
    cd nextjs-sports-analyzer
    ```
2.  **安装基本依赖**: 将 `front/package.json` 和 `backend/package.json` 中的核心依赖合并到新的 Next.js 项目的 `package.json` 中，并运行 `npm install` 或 `yarn install`。注意版本兼容性，特别是 React (Next.js 通常有其推荐的 React 版本)。

    *   **合并后的主要依赖可能包括**:
        *   `@google/genai`
        *   `@supabase/supabase-js`
        *   `aws-sdk` (for R2)
        *   `cors` (Next.js API 路由默认行为可能不同，但某些场景下可能仍需自定义)
        *   `dotenv` (Next.js 内建支持 `.env` 文件)
        *   `multer` (或寻找 Next.js API 路由中处理文件上传的替代方案/适配方法)
        *   `uuid`
        *   `react-markdown`
        *   `react-router-dom` (Next.js App Router 将取代其大部分功能，仅可能在特定客户端组件中保留复杂导航逻辑，但优先使用 Next.js 内置 Link 和 useRouter)

### 4.2. 迁移前端代码

1.  **组件迁移**:
    *   将 `front/components/` 下的 React 组件复制到 Next.js 项目的 `components/` 目录。
    *   审查并调整组件，确保与 Next.js (特别是 App Router 中的 Server Components 和 Client Components 概念) 兼容。标记需要客户端交互的组件为 `"use client";`。
    *   将 `front/App.tsx` 中的主要布局和路由结构，转化为 `app/layout.tsx` 和相应的 `app/**/page.tsx` 文件。

2.  **页面和路由迁移**:
    *   根据 `react-router-dom` 的配置，在 `app/` 目录下创建对应的文件夹和 `page.tsx` 文件。
        *   例如，如果之前有 `/profile` 路由，则创建 `app/profile/page.tsx`。
    *   使用 Next.js 的 `<Link>` 组件进行内部导航，`useRouter` hook 进行程序化导航。
    *   `react-router-dom` 的 `<Route>`, `<Switch>`, `<BrowserRouter>` 将不再直接使用。

3.  **静态资源**:
    *   将 `front/public/` (或类似目录，如 `assets/`) 中的图片、字体等静态资源移动到 Next.js 项目的 `public/` 目录。
    *   更新代码中对这些资源的引用路径。

4.  **样式迁移**:
    *   如果使用全局 CSS，可以将其内容合并到 `app/global.css`。
    *   如果使用 CSS Modules，Next.js 内建支持。
    *   如果使用 Tailwind CSS (推荐时已选择)，则可以直接开始使用。

5.  **环境变量**:
    *   将前端使用的环境变量（如 API 地址，如果之前是分离部署）迁移到 `.env.local` 文件中，并以 `NEXT_PUBLIC_` 前缀命名，以便在客户端代码中访问。
    *   例如: `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api` (在统一项目中，这个可能不再需要，可以直接调用 API 路由)。

### 4.3. 迁移后端逻辑 (API 路由)

1.  **创建 API 路由**:
    *   对于 `backend/server.js` 中的每个 Express 路由，在 `app/api/` 目录下创建相应的 `route.ts` 文件。
    *   例如，如果 Express 中有 `app.post('/api/submit-data', ...)`，则在 Next.js 中创建 `app/api/submit-data/route.ts` 并导出一个异步 `POST` 函数。

    ```typescript
    // app/api/submit-data/route.ts
    import { NextRequest, NextResponse } from 'next/server';

    export async function POST(request: NextRequest) {
      try {
        const body = await request.json();
        // ... 处理逻辑 ...
        return NextResponse.json({ message: 'Data submitted successfully', data: body });
      } catch (error) {
        return NextResponse.json({ error: 'Failed to submit data' }, { status: 500 });
      }
    }
    ```

2.  **业务逻辑迁移**:
    *   将 Express 路由处理函数中的业务逻辑代码（包括与 Supabase、R2、GenAI 的交互）迁移到对应的 API 路由函数中。
    *   考虑将可复用的业务逻辑或数据库交互代码封装在 `lib/` 目录下的模块中。

3.  **Supabase 客户端**:
    *   在 `lib/supabaseClient.ts` 中初始化 Supabase 客户端。确保环境变量 (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) 在 `.env.local` 中配置。
    *   API 路由可以导入并使用此客户端实例。

4.  **R2 (AWS SDK) 客户端**:
    *   在 `lib/r2Client.ts` 中配置和初始化 AWS S3 客户端，用于连接 Cloudflare R2。
    *   配置环境变量 (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`)。
    *   确保 `cors` 配置允许从您的 Next.js 应用前端访问 R2 (如果需要直接从客户端上传或获取)。

5.  **`@google/genai` 迁移**:
    *   在 `lib/genai.ts` 中初始化 GenAI 客户端。
    *   将原后端中使用 GenAI 的逻辑迁移到相应的 API 路由或 `lib/` 中的服务函数。

6.  **文件上传 (Multer 替代方案)**:
    *   Multer 是 Express 的中间件，不能直接在 Next.js API 路由中使用。
    *   **方案 A (推荐): 直接在 API Route 中处理 `FormData`**:
        *   Next.js API Routes (使用 `NextRequest`) 可以直接处理 `FormData`。
        ```typescript
        // app/api/upload/route.ts
        import { NextRequest, NextResponse } from 'next/server';
        import { writeFile } from 'fs/promises'; // For saving to local disk (if needed)
        import path from 'path';
        // import { r2Client, uploadToR2 } from '@/lib/r2Client'; // 假设有上传到 R2 的辅助函数

        export async function POST(request: NextRequest) {
          const formData = await request.formData();
          const file = formData.get('file') as File | null;

          if (!file) {
            return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
          }

          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);

          // 示例：保存到本地 public 目录 (仅作演示，实际可能直接上传到 R2)
          // const filePath = path.join(process.cwd(), 'public', 'uploads', file.name);
          // await writeFile(filePath, buffer);
          // console.log(`File saved to ${filePath}`);

          // 示例：上传到 R2
          // try {
          //   const r2Data = await uploadToR2(file.name, buffer, file.type);
          //   return NextResponse.json({ message: 'File uploaded to R2 successfully', data: r2Data });
          // } catch (error) {
          //   console.error('R2 Upload Error:', error);
          //   return NextResponse.json({ error: 'Failed to upload to R2' }, { status: 500 });
          // }

          return NextResponse.json({ message: 'File received, process locally or send to R2.' });
        }
        ```
    *   **方案 B: 使用第三方库**: 如 `formidable` 等库可以在 API 路由中解析 `multipart/form-data`。
    *   从前端发送文件时，使用 `FormData` 对象。

7.  **错误处理和响应**: 使用 `NextResponse.json()` 返回 JSON 响应，并设置适当的 HTTP 状态码。

8.  **CORS**: Next.js API 路由有一些默认的 CORS 行为。如果需要更细致的控制（例如，允许来自特定域的请求），可以在 `next.config.mjs` 中配置 `headers` 或在每个 API 路由中手动设置响应头。但由于前后端统一，CORS 问题会大幅减少。

### 4.4. 依赖管理

*   仔细检查 `front/package.json` 和 `backend/package.json` 中的所有依赖和脚本。
*   在新的 Next.js 项目的 `package.json` 中添加所有必要的依赖。移除冗余或不再需要的包 (如 `express`, `vite`, `nodemon`)。
*   更新开发脚本，例如 `dev`, `build`, `start`，使用 Next.js CLI (`next dev`, `next build`, `next start`)。

### 4.5. 环境变量

*   统一管理所有环境变量在项目根目录的 `.env.local` (用于本地开发，不提交到版本控制) 和其他环境特定的 `.env` 文件 (如 `.env.production`)。
*   **服务器端环境变量**:可以直接通过 `process.env.YOUR_VARIABLE` 在 API 路由和服务器组件中访问。
*   **客户端环境变量**: 需要以 `NEXT_PUBLIC_` 为前缀，才能通过 `process.env.NEXT_PUBLIC_YOUR_VARIABLE` 在浏览器中访问。
*   **重要**: 确保 Supabase、R2、GenAI 的 API 密钥等敏感信息只在服务器端代码中使用，或通过受控的 API 路由暴露给前端。不要将它们直接暴露在客户端代码中 (即不要使用 `NEXT_PUBLIC_` 前缀)。

## 5. 数据管理和状态管理

### 5.1. 数据获取

Next.js App Router 提供了多种数据获取策略：

*   **Server Components (默认)**: 组件可以在服务器上直接 `async/await` 获取数据。这是获取页面初始数据的推荐方式。
    ```typescript
    // app/some-page/page.tsx
    async function getData() {
      const res = await fetch('https://api.example.com/...');
      if (!res.ok) throw new Error('Failed to fetch data');
      return res.json();
    }

    export default async function Page() {
      const data = await getData();
      return <main>{/* Render data */}</main>;
    }
    ```
*   **Client Components**: 对于需要在客户端进行数据获取（例如，基于用户交互的 SWR 或 React Query），标记组件为 `"use client";` 并使用传统的 `useEffect` 和 `fetch`，或者使用如 `SWR` / `TanStack Query (React Query)` 等数据获取库。
*   **API Routes**: 前端组件可以通过 `fetch` 调用项目内的 API 路由 (`/api/...`) 来获取或提交数据。

### 5.2. 状态管理

*   **React Context**: 对于简单的全局状态或主题切换等，React Context 依然适用。
*   **URL State**: 对于筛选、排序、分页等状态，可以利用 URL 查询参数，由 Next.js 路由系统管理。
*   **第三方库**: 对于复杂应用，可以考虑引入状态管理库，如:
    *   **Zustand**: 轻量级、简单易用。
    *   **Jotai**: 原子化状态管理。
    *   **Redux Toolkit**: 功能强大，适合大型应用。
    *   根据当前项目的实际复杂度和团队熟悉度选择。鉴于当前项目规模，可能 React Context 或 Zustand 已经足够。

## 6. 部署

Next.js 项目非常适合部署到 Vercel (Next.js 的创建者)。

*   **Vercel**:
    1.  将代码推送到 GitHub/GitLab/Bitbucket 仓库。
    2.  在 Vercel 上连接该仓库。
    3.  Vercel 会自动检测 Next.js 项目并配置构建和部署。
    4.  环境变量可以在 Vercel 项目的设置中配置，它们会自动注入到构建和运行时环境中。
    5.  API 路由会自动部署为 Serverless Functions。
    6.  Vercel 提供全球 CDN、自动 HTTPS、预览部署等功能。

## 7. 潜在挑战和解决方案

*   **路由逻辑迁移**: 从 `react-router-dom` 迁移到 Next.js App Router 需要理解目录结构即路由的概念。
    *   **解决**: 仔细规划 `app/` 目录结构，利用路由组 `(folderName)` 组织路由而不影响 URL 路径。
*   **API 路由与 Express 的差异**:
    *   **中间件**: Express 中间件模式在 Next.js API 路由中不直接适用。可以通过高阶函数或在每个路由处理函数中调用通用函数来实现类似功能。
    *   **请求/响应对象**: Express 的 `req`, `res` 对象与 Next.js API 路由的 `NextRequest`, `NextResponse` 不同。
    *   **解决**: 学习 `NextRequest` 和 `NextResponse` API。
*   **文件上传**: Multer 不能直接用。
    *   **解决**: 如前所述，使用 `request.formData()` 直接处理，或引入其他兼容的库。
*   **Server Components vs. Client Components**: 理解两者区别和适用场景是关键。
    *   **解决**: 默认使用 Server Components。仅当组件需要生命周期方法 (useEffect, useState)、浏览器独有 API 或事件监听器时，才标记为 `"use client";`。
*   **环境变量管理**: 确保正确区分服务器端和客户端环境变量 (使用 `NEXT_PUBLIC_` 前缀)。
*   **第三方库兼容性**: 一些主要操作 DOM 或依赖旧版 React 特性的库可能需要适配或寻找替代品。

## 8. 时间预估和资源需求 (粗略)

这是一个初步估计，实际时间会根据代码复杂度和熟悉程度而变化。

*   **阶段 1: 初始化和基础设置 (1-2 天)**
    *   创建 Next.js 项目。
    *   合并依赖。
    *   设置基本目录结构和配置。
*   **阶段 2: 前端组件和页面迁移 (3-5 天)**
    *   迁移 React 组件。
    *   创建页面路由。
    *   适配样式和静态资源。
*   **阶段 3: 后端 API 逻辑迁移 (4-7 天)**
    *   将 Express 路由转换为 Next.js API 路由。
    *   迁移 Supabase, R2, GenAI 逻辑。
    *   实现文件上传。
*   **阶段 4: 数据获取和状态管理调整 (2-3 天)**
    *   实现 Server Components 数据获取。
    *   根据需要调整客户端数据获取和状态管理。
*   **阶段 5: 测试和调试 (3-5 天)**
    *   单元测试、集成测试。
    *   端到端测试。
*   **阶段 6: 部署和优化 (1-2 天)**
    *   配置 Vercel 部署。
    *   性能优化。

**总计预估**: 约 2.5 - 4 周 (假设一人全职投入)。

**所需资源**:
*   熟悉 React 和 Node.js 的开发者。
*   了解 Next.js (或有学习曲线)。
*   Supabase, Cloudflare R2, Google GenAI 的账户和 API 密钥。

## 9. 后续步骤

1.  **详细代码审查**: 对 `front/` 和 `backend/` 的代码进行更详细的审查，识别所有功能点和特殊逻辑。
2.  **小模块试点**: 选择一个简单的功能点（例如一个简单的页面和其对应的 API）进行试点迁移，以熟悉流程和发现潜在问题。
3.  **逐步迁移**: 按照上述阶段逐步进行迁移，并进行充分测试。
4.  **版本控制**: 确保在整个过程中良好使用 Git 进行版本控制。

---

本文档提供了将现有项目迁移到 Next.js 的初步设计。在实际执行过程中，可能需要根据具体情况进行调整。 