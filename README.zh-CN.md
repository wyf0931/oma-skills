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
