# Evidence-Driven Role Distillation Skill：设计说明

## 目标

在本仓库新增一个 Pi 原生 meta skill。它帮助 Agent 从公开资料、用户提供材料与组织上下文中，构建可执行的岗位包（Role Package），再据此产出目标岗位的 Agent Skill。重点是把可追溯的证据、可执行的判断规则、岗位边界与协作接口一起蒸馏出来，而非只生成一段角色提示词。

首个推荐试运行领域为 HR Director / AI Organization Architect；该 skill 本身保持领域无关。

## 非目标

- 不在此版本内置某个岗位的完整理论、JD 或社区资料库。
- 不自动授予外部工具权限、发送消息、招聘或执行任何现实业务动作。
- 不把固定数量的网页或资料当成研究完成的标准。
- 不替代用户对组织目标、职责取舍与授权边界的决策。
- 不让子代理直接修改最终岗位包或擅自启动外部写操作；主代理负责合并、裁决与交付。

## 交付结构

```text
skills/evidence-role-distillation/
├── SKILL.md
└── references/
    └── role-package.md
```

### `SKILL.md`

承担以下职责：

1. 定义触发边界：适用于“研究并构建岗位/领域 Agent skill”的任务，排除仅写单段 prompt、普通 JD 撰写或直接处理某个具体业务问题。
2. 先澄清角色契约：业务目标、服务对象、组织阶段、角色层级、可用工具与不可触碰的边界。
3. 引导一个迭代回路：多源取证 → 原子编码 → 统一术语/持续比较 → 缺口或冲突驱动的补样 → 饱和判断。
4. 让用户在候选角色树形成后执行 Keep / Remove / Merge / Delegate 剪枝，得到组织特定的岗位定义。
5. 将岗位定义编译为 Role Package，并由此生成目标 skill、知识地图与评测用例。
6. 明确证据分级、来源质量、冲突保留、停止条件、合规与授权边界。
7. 为长研究维护目标、阶段任务与证据缺口；在可用时用隔离子代理并行采样，并只把结构化发现合并回主上下文。
8. 以内化的“慢即是快、不重不漏、聚焦”原则约束取证、分类、参考资料与 skill 的编写质量。

### `references/role-package.md`

只在需要编译岗位包或设计证据账本时加载。提供：

- Evidence Ledger 的字段与置信等级 E0–E5
- Role Package 的 Markdown/YAML 结构
- 角色树的停止下钻规则
- 研究、剪枝、编译与验证的交付清单

## 工作流

```text
Role Contract
  → Evidence Acquisition ↔ Coding / Comparison ↔ Gap-driven Sampling
  → Candidate Role Model
  → HITL Shaping
  → Role Package Compilation
  → Agent Skill + Evaluation Suite
```

其中取证、编码和补样必须允许循环。最低样本量只用作启动条件；当连续的新高质量资料不再改变核心类别、属性、边界或决策规则时，才可声明“对当前用途已基本饱和”。

## 关键决策

| 决策 | 采用方式 | 原因 |
| --- | --- | --- |
| 范围 | 通用岗位蒸馏 | 能先用于 HRD，并服务后续所有 Agent team 岗位。 |
| 研究方式 | 证据驱动的角色蒸馏 | 借鉴扎根理论的编码、比较和补样，但不伪装成严格学术扎根研究。 |
| 来源 | 理论、职业模型、岗位市场、实践者、案例/工件、反例 | 防止单一 JD 或单一“最佳实践”决定岗位。 |
| 人工参与 | 角色树成熟后剪枝 | 把公域共识转化为用户组织的具体岗位，而非照搬平均岗位。 |
| 最终产物 | Role Package + Skill + Evals | Prompt 只是角色运行时的一部分。 |

## 验证

1. 运行仓库现有 `quick_validate.py`，确认前置元数据、名称和未完成占位符均通过。
2. 人工审阅三个情景是否能被完整引导：
   - 为 AI 创业团队蒸馏 HR Director / Organization Architect。
   - 为制造业企业蒸馏供应链负责人，保留行业差异。
   - 用户只想写一则招聘 JD 时，skill 应明确转交为普通写作任务，不进入完整研究回路。
3. 检查 `README.md` 与 `README.zh-CN.md` 的兼容性表和技能介绍是否同步更新。

## 变更范围

- 新增 `skills/evidence-role-distillation/`。
- 更新中英文 README 的技能清单和 Pi 兼容性矩阵。
- 不修改现有 `spec-pipeline`、`skill-creator` 或用户已有文件。
