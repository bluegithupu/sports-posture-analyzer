# 测试文件夹

本文件夹包含所有与 Cloudflare R2 上传功能相关的测试文件和文档。

## 📁 文件结构

### 🧪 测试脚本

| 文件名 | 描述 | 使用方法 |
|--------|------|----------|
| `test-r2-config.js` | 快速配置验证脚本 | `npm run test:config` |
| `test-r2-automation.js` | 完整自动化测试 | `npm run test` |
| `demo-r2-flow.js` | 可视化流程演示 | `npm run demo` |

### 📄 文档文件

| 文件名 | 描述 |
|--------|------|
| `TESTING.md` | 完整测试指南 |
| `R2_TESTING_SUMMARY.md` | 测试功能总结 |

### 🎬 测试资源

| 文件名 | 描述 |
|--------|------|
| `test-video.mp4` | 测试用视频文件 (1MB) |

## 🚀 快速开始

### 1. 配置验证
```bash
cd test
npm run test:config
```
验证 R2 配置是否正确，检查所有 API 接口。

### 2. 完整测试
```bash
cd test
npm run test
```
运行完整的端到端自动化测试，包括文件上传和分析。

### 3. 流程演示
```bash
cd test
npm run demo
```
查看可视化的 R2 上传流程演示。

## 📋 测试前提条件

1. **后端服务器运行**
   ```bash
   cd backend && npm start
   ```

2. **环境变量配置**
   确保 `backend/.env` 文件包含：
   ```env
   GEMINI_API_KEY=your_api_key
   R2_ACCESS_KEY_ID=your_access_key
   R2_SECRET_ACCESS_KEY=your_secret_key
   R2_BUCKET_NAME=your_bucket_name
   R2_ACCOUNT_ID=0ae1caed52a9460392e0450801d42ac0
   R2_PUB_URL=https://pub-0ae1caed52a9460392e0450801d42ac0.r2.dev
   ```

## 🔧 测试说明

### test-r2-config.js
- **目的**: 快速验证 R2 配置
- **测试内容**: 
  - 后端服务器连接
  - 预签名 URL 生成
  - URL 提交接口
  - 结果查询接口
- **运行时间**: ~5 秒

### test-r2-automation.js
- **目的**: 完整端到端测试
- **测试内容**:
  - 基本功能测试
  - 实际文件上传到 R2
  - 分析结果轮询
  - 性能对比测试
- **运行时间**: ~1-2 分钟

### demo-r2-flow.js
- **目的**: 可视化流程演示
- **内容**:
  - 6步上传流程说明
  - 进度条动画
  - API 请求/响应示例
  - 优势总结
- **运行时间**: ~30 秒

## 📊 测试结果解读

### ✅ 成功标志
- 所有接口返回正确状态码
- 文件成功上传到 R2
- 分析任务正常启动
- Public URL 使用正确的 Account ID

### ❌ 常见问题
1. **R2 配置错误**: 检查环境变量
2. **服务器未启动**: 运行 `cd backend && npm start`
3. **网络连接问题**: 检查网络和防火墙设置
4. **API 配额超限**: 检查 Gemini API 使用量

## 🔗 相关文档

- [`../R2_DEPLOYMENT.md`](../R2_DEPLOYMENT.md) - R2 部署配置指南
- [`../R2_BUGFIX_GUIDE.md`](../R2_BUGFIX_GUIDE.md) - 问题修复指南
- [`../backend/R2_CONFIG.md`](../backend/R2_CONFIG.md) - 详细配置说明 