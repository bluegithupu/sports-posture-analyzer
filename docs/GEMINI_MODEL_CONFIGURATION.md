# Gemini 模型配置说明

## 概述

现在您可以通过环境变量 `GEMINI_MODEL` 来配置使用的 Gemini 模型型号，而不需要修改代码。

## 配置方法

### 1. 环境变量配置

在 `.env.local` 文件中添加或修改 `GEMINI_MODEL` 环境变量：

```bash
# 默认模型（如果不设置环境变量，将使用此模型）
GEMINI_MODEL=gemini-2.0-flash

# 或者使用其他可用的模型
# GEMINI_MODEL=gemini-1.5-pro
# GEMINI_MODEL=gemini-1.5-flash
```

### 2. 可用的模型选项

根据 Google Gemini API 文档，您可以使用以下模型：

- `gemini-2.0-flash` - 最新的快速模型（默认）
- `gemini-1.5-pro` - 高性能模型
- `gemini-1.5-flash` - 快速响应模型
- 其他 Google 发布的新模型

### 3. 默认行为

- 如果未设置 `GEMINI_MODEL` 环境变量，系统将使用 `gemini-2.0-flash` 作为默认模型
- 环境变量的值会覆盖默认设置

## 代码实现

### 环境变量读取

```typescript
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
```

### 使用位置

模型配置会在以下功能中使用：

1. **视频分析** (`analyzeVideoWithGemini`)
2. **图片分析** (`analyzeImages`)
3. **分析报告** - 记录实际使用的模型名称

### 分析报告中的模型信息

分析完成后，报告中会包含实际使用的模型信息：

```json
{
  "text": "分析结果...",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "model_used": "gemini-2.0-flash",
  "analysis_type": "video"
}
```

## 使用示例

### 切换到不同模型

1. 编辑 `.env.local` 文件：
```bash
GEMINI_MODEL=gemini-1.5-pro
```

2. 重启应用程序：
```bash
npm run dev
```

3. 新的分析请求将使用 `gemini-1.5-pro` 模型

### 验证配置

您可以通过查看分析报告中的 `model_used` 字段来确认使用的模型：

- 在历史记录页面查看分析结果
- 检查分析报告的 `model_used` 字段
- 查看服务器日志确认模型配置

## 注意事项

1. **模型可用性** - 确保您选择的模型在您的 Google Cloud 项目中可用
2. **API 配额** - 不同模型可能有不同的使用配额和费用
3. **性能差异** - 不同模型在速度和质量上可能有差异
4. **重启要求** - 修改环境变量后需要重启应用程序才能生效

## 故障排除

如果遇到模型相关的错误：

1. 检查 `.env.local` 文件中的 `GEMINI_MODEL` 设置
2. 确认模型名称拼写正确
3. 验证该模型在您的 Google Cloud 项目中可用
4. 查看服务器日志获取详细错误信息

## 更新历史

- **2024-01-01**: 添加 `GEMINI_MODEL` 环境变量支持
- 默认模型保持为 `gemini-2.0-flash`
- 支持通过环境变量动态配置模型
