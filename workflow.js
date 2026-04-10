// 工作流核心引擎 - CLI 和 Web 共用
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

async function runWithClaude(prompt, apiKey, model, onStream) {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  if (onStream) {
    let full = "";
    const stream = client.messages.stream({
      model, max_tokens: 4096, system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta?.text) {
        full += event.delta.text;
        onStream(event.delta.text);
      }
    }
    return full;
  } else {
    const response = await client.messages.create({
      model, max_tokens: 4096, system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });
    return response.content.map((b) => b.text || "").join("\n");
  }
}

async function runWithOpenAICompat(prompt, apiKey, model, baseURL, onStream) {
  const client = new OpenAI({ apiKey, baseURL });
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];
  if (onStream) {
    let full = "";
    const stream = await client.chat.completions.create({ model, messages, max_tokens: 4096, stream: true });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) { full += text; onStream(text); }
    }
    return full;
  } else {
    const response = await client.chat.completions.create({ model, messages, max_tokens: 4096 });
    return response.choices[0].message.content || "";
  }
}

const SYSTEM_PROMPT = `你是一个微信公众号写作助手，为账号 @小声读书 服务。读者是关注海外金融基础设施、AI 工具、跨境科技的中国大陆用户。

写作风格硬性要求：
- 结论先行：开头 3 句话内给出核心判断
- 第一人称、口语化、短句为主
- 中英文之间加空格，中文与数字之间加空格
- 禁止使用破折号（——）
- emoji 全文最多 1 次（🏄‍♂️ 🤣 🙈 🙋‍♂️ 选一个）
- 不用"首先、其次、再次"等模板过渡词
- 不用"值得注意的是""需要指出的是"等书面腔
- 小标题用口语化问句或短语
- 每段 1-3 句话，短段落，多留白
- 用真实工具名、场景、数据举例

敏感性要求：
- 不提 VPN、翻墙、科学上网，用"网络环境""访问条件"替代
- 不涉及敏感政治话题
- 海外平台可提但不强调"国内无法访问"
- 金融内容文末加免责声明
- 加密货币只讨论技术和基础设施`;

export const STEPS = [
  { id: 1, label: "选题评估", icon: "🎯" },
  { id: 2, label: "素材准备", icon: "📦" },
  { id: 3, label: "结构搭建", icon: "🏗️" },
  { id: 4, label: "写作起稿", icon: "✍️" },
  { id: 5, label: "敏感审查", icon: "🛡️" },
  { id: 6, label: "事实核查", icon: "🔍" },
  { id: 7, label: "传播优化", icon: "📡" },
  { id: 8, label: "标题生成", icon: "💡" },
  { id: 9, label: "格式输出", icon: "📄" },
];

function buildPrompt(stepIdx, topic, prevResult) {
  const prompts = [
    // Step 1: 选题评估
    `评估以下公众号选题，从四个维度分析：
1. 时效窗口：中文互联网是否还有信息差
2. 读者痛点：是否解决目标读者的真实问题
3. 长尾价值：半年后是否还有人搜到
4. 可写性：是否有足够信息支撑

选题：${topic}

给出简洁评估（每个维度 1-2 句话），最后给一个总结判断。`,

    // Step 2: 素材准备
    `基于以下选题和评估，列出写这篇文章需要的素材清单：

选题：${topic}
评估：${prevResult}

分三块列出：
1. 需要的信息源和一手素材
2. 配图方案建议（优先级排序）
3. 可引用的工具/平台/数据

简洁列出即可。`,

    // Step 3: 结构搭建
    `基于以下选题和素材，搭建文章大纲：

选题：${topic}
前序信息：${prevResult}

要求：
- 结论先行的开头（写出具体的前 3 句话）
- 每个 H2 小标题用口语化短语或问句
- 每节 1 句话概要
- 逻辑线：是什么 → 为什么 → 怎么做 → 注意什么
- 预估全文 1500-2000 字`,

    // Step 4: 写作起稿
    `根据以下大纲，写出完整的公众号文章初稿：

选题：${topic}
大纲：${prevResult}

严格遵循写作风格要求。全文 1500-2000 字，Markdown 格式输出。

文末加上：
你的想法是什么？欢迎在评论区聊聊。

---

*以上内容仅代表个人经验分享，不构成任何投资建议。工具和平台信息可能随时更新，请以官方最新说明为准。*`,

    // Step 5: 敏感审查
    `对以下文章做敏感性审查，逐段检查：

${prevResult}

检查类别：
| 类别 | 规则 |
|---|---|
| 网络访问 | 不提 VPN、翻墙、科学上网 |
| 政治话题 | 不评论中国政策、领导人 |
| 海外平台 | 可提但不强调"国内无法访问" |
| 金融合规 | 不直接推荐交易 |
| 加密货币 | 可讨论技术，不推荐炒币 |

列出需要修改的地方（如有），然后输出修改后的完整文章。如无问题，输出原文并标注"敏感性审查通过"。`,

    // Step 6: 事实核查
    `对以下文章做事实核查：

${prevResult}

检查：
- 工具名称是否准确
- 产品功能描述是否存在
- 数据和费率是否合理
- 技术描述是否正确

用表格列出核查结果，标注需要作者确认的项目。然后输出文章（如有修改则输出修改后版本）。`,

    // Step 7: 传播优化
    `对以下文章做传播优化：

${prevResult}

检查并优化：
1. 开头测试：前 3 句话能否让读者继续读
2. 每段价值：删掉"读了也没收获"的段落
3. 转发动机：读者看完是否有分享理由
4. 结尾互动：引导语是否具体
5. 长度控制：1500-2000 字

列出修改项，然后输出优化后的完整文章。`,

    // Step 8: 标题生成
    `为以下文章生成 8 个备选标题：

${prevResult}

要求：
- 包含核心关键词（公众号搜索 SEO）
- 有点击欲望，不标题党
- 15 字以内为佳

输出格式：
1. 标题 A ⭐ 推荐 - 理由
2. 标题 B ⭐ 推荐 - 理由
3. 标题 C - 理由
...

标注 2-3 个推荐项。`,

    // Step 9: 格式输出
    `整理最终交付版本。取前面传播优化后的文章正文，结合推荐的标题，输出最终的 Markdown 文档。

前序内容：${prevResult}

交付检查清单（逐项确认）：
- [ ] 中英文空格正确
- [ ] 无破折号（——）
- [ ] emoji 最多 1 个
- [ ] 文末有互动引导
- [ ] 文末有免责声明
- [ ] 小标题口语化
- [ ] 无敏感内容
- [ ] Markdown 格式正确

输出完整的最终 Markdown 文章，开头附上检查清单的通过状态。`,
  ];

  return prompts[stepIdx];
}

export async function runStep(stepIdx, topic, prevResult, onStream, config = {}) {
  const { provider = "claude", model, apiKey } = config;
  const prompt = buildPrompt(stepIdx, topic, prevResult);

  if (provider === "minimax") {
    return runWithOpenAICompat(prompt, apiKey, "MiniMax-Text-01",
      "https://api.minimaxi.chat/v1", onStream);
  } else if (provider === "gemini") {
    return runWithOpenAICompat(prompt, apiKey, "gemini-2.0-flash",
      "https://generativelanguage.googleapis.com/v1beta/openai/", onStream);
  } else {
    return runWithClaude(prompt, apiKey, "claude-opus-4-6", onStream);
  }
}

export async function validateKey(provider, apiKey) {
  try {
    if (provider === "minimax") {
      const client = new OpenAI({ apiKey, baseURL: "https://api.minimaxi.chat/v1" });
      await client.chat.completions.create({
        model: "MiniMax-Text-01", max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      });
    } else if (provider === "gemini") {
      const client = new OpenAI({ apiKey, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" });
      await client.chat.completions.create({
        model: "gemini-2.0-flash", max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      });
    } else {
      const client = new Anthropic({ apiKey });
      await client.messages.create({
        model: "claude-haiku-4-5-20251001", max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      });
    }
    return { valid: true };
  } catch (err) {
    let error = "验证失败，请检查 Key 是否正确";
    if (err.status === 401 || err.status === 403) error = "API Key 无效，请检查后重试";
    else if (err.status === 429) error = "请求过于频繁，请稍后再试";
    else if (err.message) error = err.message.slice(0, 80);
    return { valid: false, error };
  }
}

export async function runFullWorkflow(topic, { onStepStart, onStepStream, onStepDone, onError }) {
  const results = {};
  let prevResult = "";

  for (let i = 0; i < 9; i++) {
    try {
      if (onStepStart) onStepStart(i, STEPS[i]);

      const result = await runStep(
        i,
        topic,
        prevResult,
        onStepStream ? (chunk) => onStepStream(i, chunk) : null
      );

      results[i] = result;
      prevResult = result;

      if (onStepDone) onStepDone(i, result);
    } catch (err) {
      if (onError) onError(i, err);
      throw err;
    }
  }

  return results;
}
