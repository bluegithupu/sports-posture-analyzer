# 运动姿态分析大师 (Sports Posture Analyzer)

一个基于AI的智能运动姿态分析应用，帮助用户识别运动中的姿态问题并提供专业的纠正建议。

## 🎯 项目简介

运动姿态分析大师是一款现代化的Web应用，利用Google Gemini AI技术对用户上传的运动视频进行深度分析，识别动态体态问题，并提供专业的运动医学建议和纠正性训练方案。

## 🚀 技术栈

### 前端框架与库
- **React 19.1.0** - 现代化的前端框架，使用最新版本
- **React DOM 19.1.0** - React的DOM渲染库
- **TypeScript 5.7.2** - 类型安全的JavaScript超集

### 构建工具与开发环境
- **Vite 6.2.0** - 现代化的前端构建工具，提供快速的开发体验
- **ESM (ES Modules)** - 使用现代模块系统
- **ESNext** - 使用最新的JavaScript特性

### UI与样式
- **Tailwind CSS** - 通过CDN引入的实用优先的CSS框架
- **Font Awesome 6.0** - 图标库，提供丰富的图标资源

### AI与机器学习
- **Google Gemini AI (@google/genai 1.0.1)** - Google的生成式AI API，用于视频分析和姿态识别

### 模块系统与部署
- **Import Maps** - 使用现代浏览器的import maps功能
- **ESM.sh** - 通过CDN提供npm包的ESM版本
- **环境变量支持** - 通过Vite配置支持环境变量

### 开发配置
- **严格的TypeScript配置** - 启用了严格模式和多项代码质量检查
- **路径别名** - 配置了`@/*`路径别名便于导入
- **JSX支持** - 配置为`react-jsx`模式

## 🛠️ 本地运行

**前置要求：** Node.js

1. **安装依赖：**
   ```bash
   npm install
   ```

2. **配置API密钥：**
   在 [.env.local](.env.local) 文件中设置你的 Gemini API 密钥：
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. **启动开发服务器：**
   ```bash
   npm run dev
   ```

4. **访问应用：**
   打开浏览器访问 `http://localhost:5173`

## 📦 构建与部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 🌟 主要功能

- 📹 **视频上传与播放** - 支持多种视频格式的上传和预览
- 🤖 **AI姿态分析** - 基于Google Gemini AI的智能姿态识别
- 📊 **专业报告** - 生成详细的姿态分析报告和改进建议
- 💡 **纠正性训练** - 提供针对性的训练方案和技术提示
- 📱 **响应式设计** - 适配各种设备和屏幕尺寸
- 🎨 **现代化UI** - 基于Tailwind CSS的美观界面

## 🔧 项目结构

```
sports-posture-analyzer/
├── components/          # React组件
├── App.tsx             # 主应用组件
├── index.tsx           # 应用入口
├── index.html          # HTML模板
├── vite.config.ts      # Vite配置
├── tsconfig.json       # TypeScript配置
├── package.json        # 项目依赖
└── .env.local          # 环境变量
```

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📄 许可证

本项目采用MIT许可证。

---

**注意：** 使用本应用需要有效的Google Gemini API密钥。请确保遵守相关的API使用条款和隐私政策。
