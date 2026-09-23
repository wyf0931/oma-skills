<div align="center">

# oma-skills

**来自 [ohmyagent.ai](https://ohmyagent.ai) 的 Agent 技能 — 专为 Pi 编程代理构建。**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Pi](https://img.shields.io/badge/pi-agent-7c3aed?logo=pi&logoColor=white)](https://pi.dev)

</div>

> **语言：** [English](README.md) · [中文](README.zh-CN.md)

可复用的、提示词优先的工作流，全部来自生产环境的沉淀。每个技能把一套经过验证的多步骤流程
转化为你的代理可以遵循的确定性、可验证的流水线。

## Agent 兼容性

这些技能面向 **Pi 编程代理** 编写并测试 — 这是我们主要支持的生态。其他代理的移植已在计划中，
尚未发布。

| 技能 | Claude | Codex | OpenCode | **Pi** | OpenClaw | Hermes Agent |
| ---- | :----: | :----: | :------: | :----: | :------: | :-----------: |
| spec-pipeline | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| skill-creator | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| style-maker | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| efficient-expression | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

> ✅ = 已适配并测试 · ❌ = 尚未适配
>
> **skill-creator** 是 Anthropic
> [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator)
> 的 Pi 原生移植版。其中 Claude Code 特有的部分（`claude -p`、`.claude/commands` 注入、
> Skill/Read 工具检测）被替换为 Pi 等价实现（`pi -p --skill --mode json` + `read` 工具检测）。

## 技能

### [spec-pipeline](skills/spec-pipeline/)

面向复杂编码任务的确定性 spec 编排。不依赖单一提示词，而是把请求驱动通过一条固定流水线，
并用真实的验证关卡执行结果：

```
refine → research → grill → compose → critique → implement → verify → enforce
```

- 通过子代理进行隔离研究 — 父上下文只会看到蒸馏后的答案
- `reviewer` 子代理在写任何代码之前用全新视角审查 spec
- 强制的、可执行的 `VERIFY` 块 — 直到真正通过才算完成任务
- 实现后对照项目的 `AGENTS.md` 约定做检查
- 崩溃安全：每个阶段边界都持久化到 `.pi-tasks/TASK.md`，中断后可恢复
- 多任务模式把功能分解为有序、带依赖关系的任务列表

**触发词：** 复杂/多步骤请求、"先出方案 / 先写 spec / 规划一下"、先规划后编码、功能分解。

### [skill-creator](skills/skill-creator/)

创建、评估并迭代技能 — 一个带定量基准的完整创建闭环：

```
捕获意图 → 起草 SKILL.md → 测试用例 → 双轨运行 → 打分 → 基准 → 人工评审 → 迭代 → 描述优化
```

- 双轨测试：每个评估用例并行跑 with-skill 与 baseline（without-skill），通过 `subagent`，
  让基准真正衡量技能的价值
- 定量评估带断言，`benchmark.json` 聚合（通过率 / 耗时 / token），以及浏览器查看器
  （`eval-viewer/generate_review.py`）供人工评审
- Pi 原生触发测试：`scripts/run_eval.py` 驱动 `pi -p --skill <path> --mode json`，
  检测对 SKILL.md 的 `read` 工具调用 — 无需 `.claude/commands` 注入
- 描述优化循环（`scripts/run_loop.py`）带训练/测试留出集，防止过拟合

**触发词：** 创建/构建/改进技能、技能评估、基准测试、描述优化。

### [style-maker](skills/style-maker/)

将一批 Markdown 文章蒸馏成可复用的内容与表达 Skill。它分离内容规则和表达规则，提取标题体系，并为公众号、生活方式、个人经验、非虚构和文化观察文章提供带原文证据的叙事风格分析。

```text
采集语料 → 元数据 → 内容/风格/标题蒸馏 → 可复用 Skill 包
```

- `policy` Profile 用于政策、公文、工作部署、报告、调研和新闻通讯
- `narrative` Profile 用于公众号长文和生活方式文章，包含七维叙事规则与原文证据
- 内置 CLI，支持只采集或完整蒸馏，输出可打包的 `sources/process/skill` bundle
- 优先使用 Agent 原生 web fetch；本地采集 endpoint 仅为可选后备

**触发词：** 蒸馏文章语料、提取团队写作风格、创建写作 Style Spec、统一长文编辑表达，或将政策/叙事范文变成可复用 Skill。

### [efficient-expression](skills/efficient-expression/)

场景驱动的高效表达流水线。不是从零写文案，而是让每个请求都过一遍三层 SOP — 事实清洗、叙事逻辑、语言渲染 — 并裁掉场景不需要的层：

```text
Step 0 事实核验（Deep Research / HITL） → Step 1 事实层 → Step 2 叙事层 → Step 3 渲染层
```

- 场景决策矩阵把高管汇报路由到 PROACT + BLUF，技术选型路由到 IPO + PROACT，产品发布路由到 Golden Circle + ELI5，跨团队摩擦路由到 SCQA + NVC
- 缺少公域事实时触发 Deep Research 检索补齐；缺少内部背景时触发 HITL，最多提 3 个定量问题，而不是编造数字
- 动态裁剪规则让一条钉钉回复不会被写成一份汇报信
- 内置四份参考矩阵与六个端到端实战案例（高管决策汇报、产品发布、跨团队冲突、绩效复盘、内部技术分享、线上事故复盘）

**触发词：** 周报/汇报、向上级请示或要资源、方案选型汇报、产品发布文案、复盘与绩效沟通、技术分享、故障复盘与事故通告、跨团队冲突消息，以及任何“这话怎么跟老板说 / 怎么讲给业务方听”的请求。

## 安装

```bash
pi install git:github.com/wyf0931/oma-skills
```

然后重载 Pi：

```bash
/reload
```

## 依赖

spec-pipeline 组合了两个 Pi 扩展 — 请一并安装：

```bash
pi install npm:@juicesharp/rpiv-todo     # 4 态 todo 工具（任务/阶段跟踪）
pi install npm:pi-subagents              # subagent 工具（隔离研究 & 评审）
```

| 工具 | 提供方 | 用途 |
| ---- | ------ | ---- |
| `todo` | [@juicesharp/rpiv-todo](https://pi.dev/packages/@juicesharp/rpiv-todo) | 阶段与任务跟踪、依赖排序 |
| `subagent` | [pi-subagents](https://pi.dev/packages/pi-subagents) | 隔离研究（`scout`/`researcher`）、全新视角评审（`reviewer`） |
| `bash` | 内置 | 执行 VERIFY 关卡 |

## 添加一个技能

1. 按照 [Pi 技能格式](https://pi.dev/docs/skills) 创建 `skills/<skill-name>/SKILL.md`
2. Frontmatter：`name`、`description`（面向触发词，必要时双语）、`compatibility`
3. 正文保持在 ~500 行以内；把细节推进 `references/` 以支持渐进式披露
4. 在兼容性矩阵中加一行，并在上方补充小节

## License

MIT © ohmyagent.ai — [ohmyagent.ai](https://ohmyagent.ai)
