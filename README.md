# 公众号创作工作台

基于 AI 的微信公众号 9 步全流程创作工具，支持 Web UI 和 CLI 两种模式。

## 功能

- **9 步自动化工作流**：从选题评估到最终格式输出，每步流式输出
- **多模型支持**：Claude（推荐）、MiniMax、Gemini，切换自由
- **API Key 管理**：验证后保存，明文/密文切换，内置获取指引
- **Web UI**：浏览器操作，支持暂停/继续，每步结果可手动编辑
- **CLI 模式**：终端流式输出，自动保存结果到本地文件

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动

**Web UI 模式**（推荐）：

```bash
npm run serve
# 打开 http://localhost:3210
```

**CLI 模式**：

```bash
# 交互式输入选题
npm start

# 直接传入选题
node cli.js "用 Tailscale 搭一个随身 AI 工作台"
```

CLI 模式需要提前设置环境变量：

```bash
export ANTHROPIC_API_KEY="sk-ant-xxxxx"
```

## Web UI 使用说明

### 选择模型

页面顶部选择模型提供商，默认使用各家最新最强模型：

| 提供商 | 模型 | API Key 获取 |
|--------|------|-------------|
| Claude ⭐ | claude-opus-4-6 | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| MiniMax | MiniMax-Text-01 | [platform.minimaxi.com](https://platform.minimaxi.com) → API 密钥 |
| Gemini | gemini-2.0-flash | [aistudio.google.com](https://aistudio.google.com) → Get API Key |

输入框旁的 `?` 按钮悬浮可查看各家 Key 的获取步骤。

### 填写 API Key

1. 在输入框填入 Key（点「显示」可切换明文查看）
2. 点击「验证并保存」，自动发起一次测试请求验证 Key 是否有效
3. 验证通过后 Key 保存在浏览器本地（localStorage），下次打开无需重填

### 运行工作流

输入选题，点「开始」，9 步依次流式执行：

| Step | 名称 | 说明 |
|------|------|------|
| 1 | 选题评估 | 时效窗口、读者痛点、长尾价值、可写性 |
| 2 | 素材准备 | 信息源、配图方案、可引用工具 |
| 3 | 结构搭建 | 结论先行的文章大纲 |
| 4 | 写作起稿 | 完整初稿，1500-2000 字 |
| 5 | 敏感审查 | 平台合规性检查 |
| 6 | 事实核查 | 工具名、数据、技术描述核查 |
| 7 | 传播优化 | 开头钩子、转发动机、结尾互动 |
| 8 | 标题生成 | 8 个备选标题 + 推荐 |
| 9 | 格式输出 | 最终 Markdown + 检查清单 |

- 点击顶部进度条可随时查看任意步骤的结果
- 每步结果支持手动编辑（点「编辑」按钮）
- 完成后可「复制终稿」或「保存文件」到本地

## 输出文件（CLI 模式）

运行完成后在 `output/` 目录生成：

- `2026-01-01_选题名.md` — 终稿
- `2026-01-01_选题名_全流程.md` — 9 步完整记录

## 自定义写作风格

修改 `workflow.js` 顶部的 `SYSTEM_PROMPT`，可调整：

- 账号定位和目标读者
- 写作风格要求（句式、标点、禁用词等）
- 敏感内容处理规则

## 技术栈

- **后端**：Node.js + Express
- **AI SDK**：`@anthropic-ai/sdk`（Claude）、`openai`（MiniMax / Gemini）
- **前端**：原生 JS，内嵌在 server.js，无构建步骤
