---
name: style-maker
description: >-
  蒸馏一批 Markdown 文章或网页资料，生成可复用的内容、表达、标题与叙事风格 Skill。用户要从政策、公文、公众号长文、生活方式、个人经验、非虚构或文化观察语料中提取写作规则，建立 style profile，统一多人协作文章风格，或将参考文章编译为可执行 Skill 时使用。支持只采集资料、全量蒸馏、政策 profile 和叙事 profile；不要把它用于单篇简单润色或未经授权冒充特定作者。
compatibility: >-
  需要 uv、Python 3.11+ 与 OpenAI-compatible 模型配置。优先使用宿主 Agent 的 web fetch/web search 工具采集网页；本地 localhost 采集器仅为可选后备。运行脚本前配置 OPENAI_API_KEY、OPENAI_BASE_URL、OPENAI_MODEL。
---

# Style Maker

把一组文章转化为可组合、可审计的写作 Skill。核心是区分“说什么”和“怎么说”，并把结论写成可执行约束，而不是模糊的人格提示词。

## 输出模型

```text
Corpus
  → Content Profile       # 主题、事实边界、证据、因果
  → Style Profile         # 开头、段落、语言、修辞、节奏、结尾
  → Title System          # 主题、摘要、标题层级与正文关系
  → Narrative Style       # narrative profile 才生成，附原文证据
  → Skill Package
```

每次运行生成可打包的 bundle：

```text
runs/<input-slug>-<input-hash>/
├── sources/     # Markdown 资料与来源 manifest
├── process/     # 元数据、候选词、Map 结果和词库
├── skill/       # 可安装的 Skill 文件包
└── run.json     # 本次状态和路径索引
```

## 先选择 Profile

读取 [Profile 选择表](references/profiles.md)，根据语料性质选择一个 profile。当前可用：

- `policy`：政策、公文、工作部署、总结、调研和新闻通讯。
- `narrative`：公众号长文、生活方式、个人经验、非虚构故事和文化观察。

Profile 是观察框架，不是结论。不要在 Profile 中预设“作者喜欢什么”；稳定结论必须由当前语料、文档 ID 和原文证据支撑。

## 采集资料

优先用宿主 Agent 的 web fetch/web search 能力采集网页，保留标题、正文、段落、图片链接和来源 URL。每篇文章保存成一个 Markdown 文件；资料目录应只包含本次语料。

当用户提供 URL 时：

1. 使用可用的 web fetch 工具取得 Markdown。
2. 按页面标题命名 `.md` 文件。
3. 在资料目录保存来源清单，例如 `_manifest.json`。
4. 网页资料不足时继续采集，不要用搜索摘要替代正文。

没有 web fetch 工具时，可使用内置 CLI 的本地采集后备。命令说明见 [运行手册](references/runtime.md)。

## 执行蒸馏

先确认 corpus 至少包含足够的完整文章。政策类可从 10 篇左右开始；叙事/生活方式语料建议 20 篇以上，并覆盖不同主题和时期。

`--skill-name` 是最终生成 Skill 的名称，必须由小写字母、数字和连字符组成，例如 `oma-health-life-writing`。不要省略它，除非用户明确允许模型自动命名。

```bash
<SKILL_DIR>/scripts/style-maker \
  --input <markdown-directory> \
  --profile narrative \
  --skill-name oma-health-life-writing
```

对于已有资料 bundle，先增量采集，再在同一 bundle 上执行蒸馏：

```bash
<SKILL_DIR>/scripts/style-maker collect \
  --input <url-or-url-file> \
  --run-dir <existing-run-dir>
```

运行后检查 `run.json` 的状态为 `completed`，并确认 `skill/skill.json` 所列出的所有 reference 文件存在。

## 叙事 Profile 的证据纪律

当使用 `narrative`：

1. 对故事素材、结构、情绪、节奏、张力、留白和叙述者视角逐篇观察。
2. 每个判断附文档 ID 和原文短证据。
3. 跨文章稳定出现的模式标为硬规则。
4. 偶发模式标为偏好；冲突模式标为分歧。
5. 如果语料没有统一风格，明确报告，而不是强行拼出人格。

生成文章时，先读取 `content_profile.md`、`style_profile.md`、`title_patterns.md`；叙事任务另读 `narrative_style.md`。若 source bundle 可用，再挑 3～5 篇文体和主题最接近的原文校准节奏，不复制其中的具体事实或经历。

## 边界

- 这是风格和内容策略蒸馏，不是冒充作者本人。
- 不把样本中的姓名、数据、引语或经历搬进新文章。
- 现实材料不足时先研究或缩小交付，不编造细节。
- 最终写作默认交付 Markdown/正文，不暴露内部 JSON 或过程记录。
