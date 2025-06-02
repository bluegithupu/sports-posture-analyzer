# Cloudflare R2 CORS 配置指南

## 问题诊断

上传错误的根本原因是 **CORS (跨域资源共享) 配置缺失**，导致浏览器阻止从 `localhost:3000` 向 R2 存储桶的直接上传请求。

## 解决步骤

### 1. 登录 Cloudflare 控制台

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择您的账户
3. 在左侧菜单中点击 **R2 Object Storage**

### 2. 配置存储桶 CORS 设置

1. 找到您的存储桶（例如：`sports-posture-videos`）
2. 点击存储桶名称进入详情页
3. 点击 **Settings** 标签
4. 找到 **CORS Policy** 部分
5. 点击 **Add CORS Policy** 或 **Edit**

### 3. 添加 CORS 规则

使用以下 CORS 配置：

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://your-domain.com",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

### 4. 开发环境特定配置

如果只是开发环境，可以使用更宽松的配置：

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

⚠️ **警告**: 生产环境请不要使用 `"AllowedOrigins": ["*"]`，这会带来安全风险！

### 5. 验证配置

保存配置后，等待 1-2 分钟让设置生效，然后：

1. 清除浏览器缓存
2. 重新启动开发服务器
3. 重新测试上传功能

## 生产环境建议

### 安全的 CORS 配置

```json
[
  {
    "AllowedOrigins": [
      "https://yourdomain.com",
      "https://www.yourdomain.com"
    ],
    "AllowedMethods": [
      "PUT"
    ],
    "AllowedHeaders": [
      "Content-Type",
      "Content-Length",
      "Authorization",
      "Cache-Control"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 300
  }
]
```

### 额外的安全措施

1. **启用 Public Access**: 在 R2 存储桶设置中确保启用了 Public Access
2. **自定义域名**: 考虑配置自定义域名而不是使用默认的 R2 URL
3. **预签名 URL 过期时间**: 保持较短的过期时间（5-15分钟）

## 常见问题排查

### 1. CORS 设置后仍然报错

- 清除浏览器缓存和 cookie
- 重启开发服务器
- 等待 2-3 分钟让设置完全生效
- 检查是否有拼写错误

### 2. 生产环境 CORS 错误

- 确保 `AllowedOrigins` 包含正确的生产域名
- 检查 HTTPS/HTTP 协议是否匹配
- 验证域名拼写和端口号

### 3. Preflight 请求失败

- 确保 `AllowedMethods` 包含 `PUT` 和 `OPTIONS`
- `AllowedHeaders` 需要包含所有自定义头
- `MaxAgeSeconds` 不要设置太小

## 测试配置

配置完成后，您可以使用浏览器开发者工具 Network 标签验证：

1. 应该看到成功的 `OPTIONS` preflight 请求
2. 后续的 `PUT` 请求应该返回 200 状态码
3. 没有 CORS 相关的错误信息

## 配置完成后

一旦 CORS 配置正确，您的优化上传功能将正常工作：

- ✅ 实时上传进度监控
- ✅ 网络速度检测和优化
- ✅ 自动重试机制
- ✅ 详细的错误处理
- ✅ 智能超时配置 