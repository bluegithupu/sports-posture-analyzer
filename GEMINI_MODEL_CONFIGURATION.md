# 通用 AI 模型配置说明（LiteLLM）

## 概述

系统已经切换为通过 [LiteLLM](https://github.com/BerriAI/litellm) SDK 访问大模型能力。您可以通过环境变量 `AI_MODEL`（向后兼容 `GEMINI_MODEL`）来自由切换任意兼容的模型，而无需修改代码。

## 配置方法

### 1. 环境变量配置

在 `.env.local` 文件中添加或修改以下环境变量：

```bash
# LiteLLM 访问凭证
LITELLM_API_KEY=your_api_key
# 可选：指向 LiteLLM Proxy 或兼容的 REST 接口，默认值为 https://api.openai.com/v1
# LITELLM_BASE_URL=https://your-litellm-proxy/v1

# 默认模型（如果不设置环境变量，将使用此模型）
AI_MODEL=gemini-2.0-flash

# 仍然兼容旧的 GEMINI_MODEL 环境变量
# GEMINI_MODEL=gpt-4o-mini
```

### 2. 可用的模型选项

LiteLLM 可以代理多家模型供应商，常见示例：

- Google Gemini 系列：`gemini-2.0-flash`、`gemini-1.5-pro`、`gemini-1.5-flash`
- OpenAI 系列：`gpt-4o-mini`、`gpt-4.1`、`o3-mini`
- 其他通过 LiteLLM Proxy 注册的模型

### 3. 默认行为

- 如果未设置 `AI_MODEL` 或 `GEMINI_MODEL`，系统将使用 `gemini-2.0-flash` 作为默认模型
- `AI_MODEL` 优先级高于 `GEMINI_MODEL`，便于平滑迁移
- LiteLLM 会将请求路由到配置的模型端点

## 代码实现

### 环境变量读取

```typescript
const AI_MODEL = process.env.AI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
```

### 使用位置

模型配置会在以下功能中使用：

1. **视频分析**（`analyzeMediaWithGemini` 内部通过 LiteLLM 调用）
2. **图片分析**（`analyzeImages`）
3. **分析报告** - 记录实际使用的模型名称
4. **文件上传与处理** - 统一通过 LiteLLM 的 `files` 接口完成

### 分析报告中的模型信息

分析完成后，报告中会包含实际使用的模型信息：

```json
{
  "text": "分析结果...",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "model_used": "gpt-4o-mini",
  "analysis_type": "video"
}
```

## 使用示例

### 切换到不同模型

1. 编辑 `.env.local` 文件：
```bash
AI_MODEL=gpt-4o-mini
```

2. 重启应用程序：
```bash
npm run dev
```

3. 新的分析请求将使用 `gpt-4o-mini` 模型

### 验证配置

您可以通过查看分析报告中的 `model_used` 字段来确认使用的模型：

- 在历史记录页面查看分析结果
- 检查分析报告的 `model_used` 字段
- 查看服务器日志确认模型配置

## 注意事项

1. **模型可用性** - 确保所选模型已在 LiteLLM Proxy 或对应平台上配置好
2. **API 配额** - 不同模型可能有不同的使用配额和费用
3. **性能差异** - 不同模型在速度和质量上可能有差异
4. **重启要求** - 修改环境变量后需要重启应用程序才能生效
5. **文件上传限制** - 某些模型不支持文件分析，请确认 LiteLLM 配置

## 故障排除

如果遇到模型相关的错误：

1. 检查 `.env.local` 文件中的 `AI_MODEL` / `GEMINI_MODEL` 设置
2. 确认模型名称拼写正确并在 LiteLLM 配置中存在
3. 验证 LiteLLM Proxy 或目标服务的访问凭证有效
4. 查看服务器日志获取详细错误信息

## 更新历史

- **2025-03-XX**: 升级为 LiteLLM SDK，新增 `AI_MODEL`、`LITELLM_API_KEY`、`LITELLM_BASE_URL` 配置
- **2024-01-01**: 添加 `GEMINI_MODEL` 环境变量支持
- 默认模型保持为 `gemini-2.0-flash`
- 支持通过环境变量动态配置模型
