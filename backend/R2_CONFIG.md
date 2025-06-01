# R2 配置说明

## 环境变量配置

### 必需配置

```env
# Google Gemini API Key
GEMINI_API_KEY=your_actual_gemini_api_key

# Cloudflare R2 基础配置
R2_ACCESS_KEY_ID=your_actual_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_actual_r2_secret_access_key
R2_BUCKET_NAME=sports-posture-videos
R2_ACCOUNT_ID=0ae1caed52a9460392e0450801d42ac0
```

### 公开访问URL配置（三种方式，按优先级排序）

#### 1. R2_PUB_URL（推荐，最高优先级）
```env
R2_PUB_URL=https://pub-0ae1caed52a9460392e0450801d42ac0.r2.dev
```
- **优点**: 直接指定完整URL，最明确可靠
- **使用场景**: 推荐在所有环境中使用

#### 2. R2_CUSTOM_DOMAIN（中等优先级）
```env
R2_CUSTOM_DOMAIN=your-custom-domain.com
```
- **优点**: 使用自定义域名，品牌化
- **使用场景**: 当您有自定义域名时使用

#### 3. 默认格式（最低优先级）
如果以上两个都未配置，系统将使用默认格式：
```
https://pub-{R2_ACCOUNT_ID}.r2.dev
```

## 配置示例

### 开发环境
```env
GEMINI_API_KEY=your_dev_gemini_key
R2_ACCESS_KEY_ID=your_dev_access_key
R2_SECRET_ACCESS_KEY=your_dev_secret_key
R2_BUCKET_NAME=sports-posture-videos-dev
R2_ACCOUNT_ID=0ae1caed52a9460392e0450801d42ac0
R2_PUB_URL=https://pub-0ae1caed52a9460392e0450801d42ac0.r2.dev
PORT=5002
```

### 生产环境
```env
GEMINI_API_KEY=your_prod_gemini_key
R2_ACCESS_KEY_ID=your_prod_access_key
R2_SECRET_ACCESS_KEY=your_prod_secret_key
R2_BUCKET_NAME=sports-posture-videos
R2_ACCOUNT_ID=0ae1caed52a9460392e0450801d42ac0
R2_PUB_URL=https://pub-0ae1caed52a9460392e0450801d42ac0.r2.dev
```

## 配置验证

创建 `.env` 文件后，可以使用以下命令验证配置：

```bash
npm run test:config
```

## 注意事项

1. **Account ID 必须正确**: 确保使用正确的 Account ID `0ae1caed52a9460392e0450801d42ac0`
2. **URL 格式**: R2_PUB_URL 必须以 `https://` 开头，不要在末尾添加 `/`
3. **安全性**: 不要将 `.env` 文件提交到版本控制系统
4. **优先级**: 系统会按照 R2_PUB_URL > R2_CUSTOM_DOMAIN > 默认格式 的顺序选择URL格式 