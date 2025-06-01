# 后端环境变量配置

在 `backend` 目录下创建 `.env` 文件，内容如下：

```
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Supabase 配置
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

请将以下内容替换为实际值：
- `your_actual_gemini_api_key_here`：从 Google AI Studio 获取的实际 API 密钥
- `your_supabase_project_url`：你的 Supabase 项目 URL
- `your_supabase_anon_key`：你的 Supabase 匿名密钥 