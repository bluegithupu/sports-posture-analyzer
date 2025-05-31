# 运动姿态分析大师 (Sports Posture Analyzer)

一个基于AI的运动视频姿态分析工具，帮助用户分析运动姿态并提供专业的改进建议。

## 🎯 项目简介

运动姿态分析大师是一款现代化的Web应用，利用Google Gemini AI技术对用户上传的运动视频进行深度分析，识别动态体态问题，并提供专业的运动医学建议和纠正性训练方案。

## 🆕 新功能：智能视频压缩

为了解决视频上传速度慢的问题，我们新增了智能视频压缩功能：

### 主要特性

- **自动压缩**: 当视频文件超过设定大小时自动进行压缩
- **智能优化**: 保持视频质量的同时显著减小文件大小
- **多种预设**: 提供高质量、标准质量、快速上传、极速上传等预设选项
- **实时进度**: 显示压缩进度和预估时间
- **浏览器兼容**: 支持现代浏览器的MediaRecorder API

### 压缩选项

| 预设 | 分辨率 | 质量 | 比特率 | 适用场景 |
|------|--------|------|--------|----------|
| 高质量 | 1920×1080 | 80% | 1.5Mbps | 专业分析 |
| 标准质量 | 1280×720 | 60% | 800kbps | 日常使用 |
| 快速上传 | 854×480 | 40% | 400kbps | 网络较慢 |
| 极速上传 | 640×360 | 30% | 200kbps | 移动网络 |

### 技术实现

- 使用HTML5 Canvas和MediaRecorder API进行客户端压缩
- 支持WebM (VP9/VP8) 和 MP4 (H.264) 格式
- 自动选择最佳编码格式
- 保持视频宽高比
- 实时压缩进度反馈

## 技术栈

- **前端**: React 19 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **AI服务**: Google Gemini API
- **视频处理**: HTML5 Canvas + MediaRecorder API

## 快速开始

### 环境要求

- Node.js 16+
- 现代浏览器 (支持MediaRecorder API)

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd sports-posture-analyzer
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
# 创建 .env 文件
echo "API_KEY=your_google_gemini_api_key" > .env
```

4. 启动开发服务器
```bash
npm run dev
```

5. 打开浏览器访问 `http://localhost:5173`

## 功能特性

- 🎥 **视频上传**: 支持多种视频格式 (MP4, MOV, AVI等)
- 🤖 **AI分析**: 基于Google Gemini AI进行专业姿态分析
- 📊 **详细报告**: 提供具体的问题识别和改进建议
- 🎨 **现代UI**: 美观的用户界面和流畅的交互体验
- 📱 **响应式设计**: 支持桌面和移动设备
- 🔧 **智能压缩**: 自动优化视频文件大小

## 使用说明

### 基本使用流程

1. **上传视频**: 点击"选择视频文件"按钮上传运动视频
2. **自动压缩**: 系统会根据设置自动压缩大文件
3. **开始分析**: 点击"获取体态分析报告"开始AI分析
4. **查看报告**: 等待分析完成后查看详细的姿态分析报告

### 压缩设置

1. **启用/禁用压缩**: 使用开关控制是否自动压缩
2. **选择预设**: 根据需求选择合适的压缩预设
3. **自定义设置**: 调整分辨率、质量、比特率等参数
4. **手动压缩**: 对已上传的文件进行手动压缩

### 最佳实践

- **文件大小**: 建议视频文件小于50MB以获得最佳上传体验
- **视频质量**: 确保视频清晰度足够进行姿态分析
- **网络环境**: 在网络较慢时选择"快速上传"或"极速上传"预设
- **浏览器**: 使用Chrome、Firefox、Safari等现代浏览器

## 浏览器支持

| 浏览器 | 版本要求 | 压缩支持 |
|--------|----------|----------|
| Chrome | 47+ | ✅ 完全支持 |
| Firefox | 29+ | ✅ 完全支持 |
| Safari | 14+ | ✅ 完全支持 |
| Edge | 79+ | ✅ 完全支持 |

## 故障排除

### 压缩相关问题

**Q: 压缩失败怎么办？**
A: 系统会自动回退到原文件，不影响正常使用。

**Q: 压缩后文件变大了？**
A: 对于已经高度压缩的视频，可能出现此情况。系统会自动使用原文件。

**Q: 压缩速度很慢？**
A: 压缩速度取决于视频长度和设备性能，建议使用较低的质量设置。

### 上传相关问题

**Q: 上传失败？**
A: 检查网络连接和API密钥配置，确保文件大小在限制范围内。

**Q: 分析时间过长？**
A: 大文件分析需要更多时间，建议使用压缩功能减小文件大小。

## 开发指南

### 项目结构

```
src/
├── components/          # React组件
│   ├── FileUpload.tsx          # 文件上传组件
│   ├── CompressionSettings.tsx # 压缩设置组件
│   ├── CompressionProgress.tsx # 压缩进度组件
│   └── ...
├── utils/              # 工具函数
│   └── videoCompression.ts    # 视频压缩工具
└── App.tsx            # 主应用组件
```

### 添加新的压缩预设

```typescript
// 在 CompressionSettings.tsx 中添加新预设
const presets = [
  // ... 现有预设
  {
    name: '自定义预设',
    settings: { 
      maxWidth: 1600, 
      maxHeight: 900, 
      quality: 0.7, 
      videoBitrate: 1200000, 
      maxFileSize: 75 
    }
  }
];
```

### 自定义压缩算法

```typescript
// 在 videoCompression.ts 中扩展压缩方法
static async customCompress(
  file: File,
  options: CompressionOptions
): Promise<File> {
  // 实现自定义压缩逻辑
}
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 更新日志

### v1.1.0 (最新)
- ✨ 新增智能视频压缩功能
- 🎛️ 添加压缩设置面板
- 📊 实时压缩进度显示
- 🔧 多种压缩预设选项
- 🚀 显著提升上传速度

### v1.0.0
- 🎉 初始版本发布
- 🎥 基础视频上传功能
- 🤖 AI姿态分析
- 📱 响应式设计

## 联系我们

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件
- 加入讨论群

---

**注意**: 使用本应用需要有效的Google Gemini API密钥。请确保遵守相关的使用条款和隐私政策。
