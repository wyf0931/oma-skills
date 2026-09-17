---
name: evidence-role-distillation
description: >-
  从公开资料、岗位描述、实践材料或用户文档中研究、蒸馏并编译真实岗位/专业领域，产出有证据支撑的
  Agent Role Package 与可部署 Skill。用户要创建 Agent 岗位、虚拟组织职位、专家 Skill、能力模型、
  岗位边界或基于证据的岗位模型时使用；不适用于只写招聘 JD、回答单个领域问题或写一段人设提示词。
compatibility: >-
  需要网页研究能力。可用时使用 todo 和 subagent；长期研究建议使用 goal。Pi 原生工作流假定已安装
  pi-subagents 与 @juicesharp/rpiv-todo。
---

# 证据驱动的岗位蒸馏

把真实世界的岗位证据转化为组织特定的 Agent Role Package。目标是可运行的岗位操作系统，包括使命、权限、职责、能力、判断逻辑、边界、交接、工具、Skill、记忆和评测，而不是一段人设提示词。

## 工作原则

- **慢即是快**。先做来源选择、原子编码、情境比较和边界定义；研究深度匹配风险，但必须有停止条件。
- **不重不漏**。统一同义概念并审计来源、情境、决策、边界和反例覆盖。
- **聚焦**。每条资料、任务和树分支都服务 Role Contract；无关发现进入 `deferred`，不得自行扩大范围。

## 角色契约与任务管理

研究前一次性补齐会改变模型的信息：业务/用户价值、组织上下文、目标岗位和层级、服务对象、行业/地域、可建议/决定/执行/禁止的事项、工具与数据、审批点，以及要交付岗位包还是 Skill。

多源任务在支持时建立顶层 goal，完成条件是用户塑形后的岗位包、请求的 Skill 与 evals，不是固定数量链接。使用 `role-contract`、`source-plan`、`evidence-mining`、`coding`、`gap-sampling`、`role-model`、`hitl-shaping`、`compilation`、`evaluation` 追踪阶段；每项写清输入、产物、负责人、依赖和完成条件。

## 证据循环

```text
Role Contract → Source Plan → Acquire ↔ Code ↔ Compare ↔ Gap-driven Sampling
→ Candidate Role Model → HITL Shaping → Role Package / Agent Skill → Evaluate and revise
```

区分理论/标准、职业模型、岗位市场、实践者 know-how、案例/工件和失败/争议证据。每项资料拆成可归属的原子主张，编码为 `mission`、`responsibility`、`activity`、`competency`、`knowledge`、`know-how`、`decision-rule`、`metric`、`tool`、`risk`、`boundary`、`handoff` 或 `context`，并写入 [岗位包参考](references/role-package.md)。

可用 subagent 时并行分派独立证据线，不分派最终裁决。每个 scout 返回来源、类型、原子主张、定位支持、角色情境、反例、置信理由和开放问题；主代理统一术语、维护 Evidence Ledger，只合并精简发现。

持续比较同义词、层级、情境变体和真正的新类别。按“岗位 → 能力域 → 职责 → 活动 → 决策/know-how”下钻，只有节点具备独立职责、判断、know-how 或边界时才继续。新可信资料不再改变当前用途的核心类别、属性、边界或规则时，报告饱和理由与剩余不确定性。

向用户展示候选树和取舍，请其标记 **Keep / Remove / Merge / Delegate / Investigate**。只有经过该步骤，公域岗位模型才成为组织特定定义。

## 编译、验证与安全

编译前读取 [岗位包参考](references/role-package.md)。产出岗位包，再生成引用岗位包的目标 Skill，避免复制整份研究笔记。评测至少覆盖典型判断、情境变体、边界、低置信/冲突证据和交接。

重要结论必须可追溯并展示置信度；E0/E1 只能作为研究线索，未经用户确认不得成为硬规则。不得伪造来源、覆盖度、专业性或饱和。岗位包描述权限但不授予权限；外部动作、人事决定、法律建议和其他高后果执行须取得用户授权。
