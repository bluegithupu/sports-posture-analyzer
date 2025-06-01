# R2 上传功能测试指南

本文档说明如何测试 Cloudflare R2 文件上传功能。

## 测试脚本概览

我们提供了三种测试方式：

1. **配置测试** (`test-r2-config.js`) - 快速验证 R2 配置是否正确
2. **完整自动化测试** (`test-r2-automation.js`) - 完整的端到端测试
3. **手动测试** (`front/test-r2.html`) - 浏览器中的交互式测试

## 前置条件

### 1. 安装依赖

```bash
# 安装测试脚本依赖
npm install

# 安装后端依赖
cd backend && npm install

# 安装前端依赖
cd ../front && npm install
```

### 2. 配置环境变量

在 `backend/.env` 文件中配置：

```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Cloudflare R2 Configuration
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_ACCOUNT_ID=your_r2_account_id

# Server Configuration
PORT=5002
```

### 3. 启动后端服务器

```bash
cd backend
npm start
```

## 测试方法

### 方法 1: 快速配置测试 ⚡

最快速的方式验证 R2 配置是否正确：

```bash
node test-r2-config.js
```

**预期输出：**
```
🔧 测试 Cloudflare R2 配置
========================================

1. 检查后端服务器...
✅ 后端服务器运行正常

2. 测试预签名 URL 生成...
✅ 预签名 URL 生成成功
   Object Key: videos/12345678-1234-1234-1234-123456789abc.mp4
   Upload URL: https://account.r2.cloudflarestorage.com/bucket/videos/...
   Public URL: https://account.r2.cloudflarestorage.com/bucket/videos/...
   过期时间: 300 秒

3. 测试 URL 提交接口...
✅ URL 提交接口正常
   Job ID: abcd1234-5678-9012-3456-789012345678

4. 测试结果查询接口...
✅ 结果查询接口正常
   状态: pending

🎉 R2 配置测试完成！
========================================
✅ 所有接口都正常工作
✅ R2 配置正确
✅ 系统准备就绪
```

### 方法 2: 完整自动化测试 🤖

测试完整的上传流程，包括实际文件上传：

```bash
# 使用默认测试文件
node test-r2-automation.js

# 使用自定义视频文件
node test-r2-automation.js /path/to/your/video.mp4
```

**测试内容：**
- ✅ 后端服务器状态检查
- ✅ 预签名 URL 生成
- ✅ 文件上传到 R2
- ✅ 视频 URL 提交
- ✅ 分析结果轮询
- ✅ 性能对比测试

### 方法 3: 手动浏览器测试 🌐

在浏览器中进行交互式测试：

```bash
# 启动前端开发服务器
cd front
npm run dev

# 访问测试页面
open http://localhost:5173/test-r2.html
```

**测试步骤：**
1. 选择视频文件
2. 点击"开始上传"
3. 观察上传进度和日志
4. 确认分析任务启动

## 故障排除

### 常见错误及解决方案

#### 1. "R2 not configured on the server"

**原因：** R2 环境变量未配置或配置错误

**解决方案：**
```bash
# 检查 backend/.env 文件是否存在且包含所有必需的 R2 配置
cat backend/.env

# 确保包含以下变量：
# R2_ACCESS_KEY_ID=...
# R2_SECRET_ACCESS_KEY=...
# R2_BUCKET_NAME=...
# R2_ACCOUNT_ID=...

# 重启后端服务器
cd backend && npm start
```

#### 2. "无法连接到后端服务器"

**原因：** 后端服务器未启动

**解决方案：**
```bash
# 启动后端服务器
cd backend
npm start

# 验证服务器运行
curl http://localhost:5002
```

#### 3. "预签名 URL 生成失败"

**原因：** R2 API 凭证错误或权限不足

**解决方案：**
1. 验证 Cloudflare R2 API Token 权限
2. 确认 Account ID 正确
3. 检查 Bucket 名称是否存在

#### 4. "文件上传失败"

**原因：** CORS 配置问题或网络连接问题

**解决方案：**
1. 检查 R2 Bucket 的 CORS 配置
2. 确认网络连接正常
3. 验证预签名 URL 未过期

## 测试结果解读

### 成功指标

- ✅ 所有测试步骤都显示绿色勾号
- ✅ 预签名 URL 生成成功
- ✅ 文件上传返回 2xx 状态码
- ✅ 分析任务成功启动并获得 Job ID

### 性能指标

- 📊 R2 上传速度 vs 传统上传速度
- 📊 预签名 URL 生成时间 < 1000ms
- 📊 文件上传时间取决于文件大小和网络速度

## 持续集成

### GitHub Actions 示例

```yaml
name: R2 Upload Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      
      - name: Install dependencies
        run: |
          npm install
          cd backend && npm install
      
      - name: Start backend
        run: cd backend && npm start &
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
          R2_BUCKET_NAME: ${{ secrets.R2_BUCKET_NAME }}
          R2_ACCOUNT_ID: ${{ secrets.R2_ACCOUNT_ID }}
      
      - name: Wait for backend
        run: sleep 10
      
      - name: Run R2 config test
        run: node test-r2-config.js
```

## 测试最佳实践

1. **定期测试** - 在每次部署前运行配置测试
2. **监控性能** - 记录上传时间和成功率
3. **测试不同文件大小** - 验证大文件上传功能
4. **错误处理测试** - 故意触发错误条件验证错误处理
5. **并发测试** - 测试多个同时上传的情况

---

通过这些测试方法，您可以确保 R2 上传功能正常工作并满足性能要求。 