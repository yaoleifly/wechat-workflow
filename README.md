# 公众号创作工作台

一键走完微信公众号 9 步创作工作流，基于 Claude API 自动化。

## 快速开始

### 1. 安装依赖

```bash
cd wechat-workflow-local
npm install
```

### 2. 配置 API Key

```bash
export ANTHROPIC_API_KEY="sk-ant-xxxxx"
```

### 3. 运行

**CLI 模式**（命令行，适合 Claude Code 集成）：

```bash
# 交互式输入选题
npm start

# 直接传入选题
node src/cli.js "用 Tailscale 搭一个随身 AI 工作台"
```

**Web UI 模式**（浏览器操作）：

```bash
npm run serve
# 打开 http://localhost:3210
```

## 两种模式说明

### CLI 模式

- 终端内流式输出，实时看到每步进度
- 自动保存终稿和全流程记录到 `output/` 目录
- 适合在 Claude Code 中调用或脚本化

### Web UI 模式

- 浏览器可视化操作，9 步进度一目了然
- 支持暂停/继续，每步结果可手动编辑
- 终稿一键复制或保存到本地文件

## 工作流 9 步

| Step | 名称 | 说明 |
|------|------|------|
| 1 | 选题评估 | 时效窗口、读者痛点、长尾价值、可写性 |
| 2 | 素材准备 | 信息源、配图方案、引用素材 |
| 3 | 结构搭建 | 文章大纲，结论先行 |
| 4 | 写作起稿 | 完整初稿，口语化 + 高信息密度 |
| 5 | 敏感审查 | 检查平台合规性 |
| 6 | 事实核查 | 验证工具、数据、技术描述 |
| 7 | 传播优化 | 开头、转发动机、结尾互动 |
| 8 | 标题生成 | 8 个备选标题 + 推荐 |
| 9 | 格式输出 | 最终 Markdown + 检查清单 |

## 输出文件

运行完成后在 `output/` 目录下生成：

- `2026-04-10_选题名.md` — 终稿，可直接复制到 md.newkit.site
- `2026-04-10_选题名_全流程.md` — 9 步完整记录

## Claude Code 集成

在 Claude Code 中可以直接调用：

```bash
claude "帮我用 wechat-workflow-local 写一篇关于 ZA Bank 的文章"
```

或者在项目中配置 MCP/Skills 调用 CLI 脚本。

## 自定义

- 修改 `src/workflow.js` 中的 `SYSTEM_PROMPT` 调整写作风格
- 修改 `buildPrompt()` 中各步骤的 prompt 调整流程细节
- 修改 `package.json` 中 model 版本切换模型
