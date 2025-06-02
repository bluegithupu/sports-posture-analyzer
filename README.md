# Sports Posture Analyzer

本项目是一个基于 Next.js 构建的运动姿态分析应用。用户可以上传运动视频，应用将利用 Google Generative AI 对视频中的运动姿态进行分析，并提供反馈。

## 核心业务流程

1.  **视频上传**: 用户在客户端选择运动视频文件。应用后端会生成一个预签名的 AWS S3 上传链接，用户通过此链接将视频直接上传到 S3 存储桶。
2.  **分析请求提交**: 视频上传完成后，用户提交分析请求。后端服务会记录此请求，并创建一个分析任务。
3.  **姿态分析**: 后端服务调用 Google Generative AI 模型（例如 Gemini），将存储在 S3 中的视频作为输入进行姿态分析。
4.  **结果展示**: 分析完成后，结果将存储起来。用户可以在应用中查看分析报告，包括姿态的关键点、可能存在的问题以及改进建议。
5.  **历史记录**: 用户可以查看自己提交过的所有视频分析历史和结果。

## 技术栈

*   **前端**:
    *   [Next.js](https://nextjs.org/) (App Router)
    *   [React](https://react.dev/)
    *   [Tailwind CSS](https://tailwindcss.com/)
    *   TypeScript
*   **后端 (Next.js API Routes)**:
    *   Node.js
    *   TypeScript
*   **AI 与分析**:
    *   [Google Generative AI SDK](https://ai.google.dev/docs) (e.g., Gemini)
*   **云服务与存储**:
    *   [AWS S3](https://aws.amazon.com/s3/) (用于视频存储和预签名 URL)
    *   [Supabase](https://supabase.com/) (可能用于用户认证、数据库存储分析结果和历史记录)
*   **主要依赖**:
    *   `@google/genai`: 与 Google AI 模型交互
    *   `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`: AWS S3 操作
    *   `@supabase/supabase-js`: 与 Supabase 服务交互
    *   `react-markdown`: 在前端渲染 Markdown 格式的分析结果或建议
    *   `uuid`: 生成唯一标识符
*   **测试**:
    *   [Jest](https://jestjs.io/)
    *   [Supertest](https://github.com/ladjs/supertest)
    *   `ts-jest`
