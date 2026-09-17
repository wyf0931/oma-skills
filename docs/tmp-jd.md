user input:
```
# META SKILL: CONTENT DISTILLATION ENGINE
## ROLE
你是专业的内容蒸馏专家（Content Distiller）。你的核心能力不是直接回答领域业务问题，而是**接收一个目标Agent/Skill的定义，把领域原始知识体系蒸馏、压缩、结构化，最终产出一份可直接部署的领域Skill（例如HRD Skill）**。
你只负责蒸馏工作，不充当该领域业务专家；你输出的成品，才是领域专家Skill。

## CORE DEFINITION: Content Distillation
内容蒸馏，是将非结构化、冗余、冲突、海量原始领域素材，经过降噪、骨架提取、逻辑收敛、规则固化、边界锁定，提炼为一套大模型可以稳定使用的领域专家心智模型。
区别于简单文档摘要/RAG切片：蒸馏产出包含【角色心智、思考框架、决策规则、操作范式、边界红线、输出规范、测试校验案例】，让目标Skill拥有领域专业思维，而不是片段检索。

## 5-STAGE DISTILLATION WORKFLOW（强制按顺序执行）
Stage 1｜Define Target Skill Boundary 目标角色锚定
1. 接收用户输入：目标Skill名称、适用场景、目标层级、服务对象
2. 输出：角色定位、核心使命、权责清单、严格边界【哪些归它做 / 哪些不属于它，禁止越权】
3. 识别角色混淆点：区分本角色和上下游相近岗位，写进约束，防止角色漂移

Stage 2｜Extract Knowledge Skeleton 提取知识骨架
1. 拆解该领域一级、二级知识模块，搭建目录框架
2. 区分三类知识：①基础定义 ②核心理论/思维模型 ③实操流程 ④判断标准&决策规则 ⑤风险与合规红线
3. 删除过时、低价值、重复内容；标记知识冲突点并做收敛裁定

Stage3｜Formalize Expert Thinking Logic 固化专家思考范式
> 最重要环节：提炼该领域专家分析问题的思考链条（不是知识点罗列）
- 遇到问题时，专家默认分析步骤
- 常用诊断框架、判断维度
- 专家的思维偏好、避坑原则、常见认知偏差

Stage4｜Generate Deliverables 产出目标Skill成品
输出2个核心交付物：
A. Target Skill System Prompt（领域技能系统提示词，可直接启用）
B. Structured Knowledge Base Outline（结构化知识库大纲，后续灌入RAG，可填充原始资料）

Stage5｜Validation Test Suite 校验测试用例
生成3~5条专业测试prompt，用来验证蒸馏出来的Skill是否对齐预期；同时标注【不合格输出特征】，用于后续迭代优化。

## OUTPUT RULES
1. 先向用户确认目标Skill基础信息（如果信息不足，一次性问全，不要多轮零散提问）：
    - Skill名称
    - 目标层级（入门/资深/专家/高管）
    - 使用场景（To内部顾问 / To业务管理者 / To员工）
    - 行业限定（是否限定行业：互联网/制造/通用等）
2. 全程保持元技能身份：你不直接解答业务问题，只做蒸馏。
3. 输出排版结构化，使用标题、列表、分割线，避免大段无格式文字。
4. 所有边界约束必须显性写出，作为Skill内置硬规则。
5. 当用户提供原始资料文本，你可以基于资料执行蒸馏；无资料时，基于行业通用知识搭建骨架。

## START INSTRUCTION
请告诉我你想要蒸馏生成的目标Skill基础信息，我启动5阶段内容蒸馏流程。


```

这是一个 Meta prompt，主要用来从公开的网络信息中蒸馏一些特定领域的 skill，比如，我想要蒸馏一个 HR 人力资源总监的岗位，可能需要先了解什么是人力资源，核心经典资料、理论，然后再搜索几个不同行业领域的 人力资源总监的岗位描述，比如从 Google，百度等进行搜索（我们的 agent 有 web\_search tool 可以使用），web fetch 对应的信息后，记录到 tmp/xxx 中，至少 10 条左右；然后做置信分析 （扎根理论） 或者相关蒸馏方法，把岗位的 content 先快速 overview，然后对内容进行分组，然后按分组进行进一步的分组，最多不超过四层；实现精细化的了解这些岗位。下钻的思路。

有了理论，有了实际岗位案例，就大致知道了这个 HR总监的基本情况和能力要求了。此时就可以根据能力要求和理论 knowledge 、know-how （这块可以搜索相关的社区，比如产品经理类的，可以搜索 v2ex，人人都是产品经理 等，可以先搜 关键词 + 社区，然后再从声量较大的、可信度较高、内容质量较高的信心中，建立信源清单（这也是一块单独的方法论，我只是提一嘴），然后开始构建 know-how，有了 knowledge+know-how，以及相关的经验库（决策表、规则、约束等），基本上就是一个相对高质量的 skill 了。具体的蒸馏过程中，可以HITL，让用户做剪枝，去掉一些不重要的职能或者职责，这样更聚焦。比如 可能有些公司的 HR 不需要关注人员培训、考勤、招聘等具体事务。这都是在挖掘 公域信息后，可以快速构建的 tree，然后剪枝。这是我的蒸馏思路。你可以搜索社区最佳实践经验，然后总结一套方法论给我。

我们的目标是，构建一个 Meta skill，帮我快速构建一些 垂直领域的 skill。
整体业务背景是，我正在搭建一个 agent team，ai 时代，agent 已经可以扮演具体的某个岗位和员工了，但是 agent team ，最重要的是岗位的设定，职责、边界、协作等，这些定好了才会有高质量的输出，而不是一堆模糊的边际，有了 agent 的边界，才会配置对应的权（tools等）、责，配置能力清单（辅助的 skills，mcp 等，提供数据源）。实现真正的虚拟组织。而我们整个快速构建 team 时，会设定一个 team 的 work 背景，即 商业目标或者用户价值导向。team 为 CEO 负责，CEO 为用户价值和商业价值负责。整体宏观框架如此。在统一的用户价值和商业目标的定义下，我们需要一个高阶的通用的 HR 人力资源总监agent，帮我们快速搭建一个 team，多个岗位、角色，设定职责边界和能力要求。我们就能快速搭配和筹建团队了。一切从人力资源入手。Meta skill 本身也可以生产人力资源总监这个岗位。因此我们的 Meta skill 先聚焦于人力资源领域也行，如果必须要倾斜的话。


AI response:
你的思路是对的，而且我建议把它从“**5-stage Skill 蒸馏**”进一步升级成：

> **Evidence-driven Role Distillation：证据驱动的岗位/角色蒸馏系统**

核心不是“总结这个岗位是什么”，而是：

> **从公域证据中反向重建一个可执行的 Role Model，再把 Role Model 编译成 Agent Skill。**

这样才真正适合你要做的 **Virtual Organization / Agent Team Builder**。

我先给结论，再解释为什么。

---

# 一、先修正一个关键点：你的 5 Stage 太“线性”

你现在的流程：

> Boundary → Knowledge → Thinking → Skill → Validation

对于普通的 Skill 制作没问题，但对于你现在这个 Meta Skill，**最大的问题是把“研究”当成了单向流水线**。

真实的岗位蒸馏应该更像：

```text
                 ┌───────────────┐
                 │  Role Hypothesis│
                 └───────┬───────┘
                         ↓
                ┌─────────────────┐
                │ Evidence Mining │
                └────────┬────────┘
                         ↓
                ┌─────────────────┐
                │ Coding / Cluster│
                └────────┬────────┘
                         ↓
               ┌──────────────────┐
               │ Role Model Draft │
               └────────┬─────────┘
                        ↓
          ┌─────────────┴─────────────┐
          ↓                           ↓
    Evidence Gap                 Contradiction
          ↓                           ↓
   Theoretical Sampling       More Evidence
          └─────────────┬─────────────┘
                        ↓
                 Role Model
                        ↓
                 HITL Pruning
                        ↓
             Decision / Boundary Model
                        ↓
                 Agent Skill
                        ↓
                     Evals
                        ↺
```

这是因为真正的扎根式分析强调：

* coding
* constant comparison
* theoretical sampling
* memoing
* saturation

而且这些过程是**循环发生的**，不是“收集完资料 → 再分析”。([CASRAI][1])

所以，我建议你的 Meta Skill 不叫：

> 5-STAGE DISTILLATION WORKFLOW

而叫：

> **Evidence-Driven Role Distillation Loop**

内部依然可以有 Stage，但 Stage 是“状态”，不是死板的线性流程。

---

# 二、你真正需要蒸馏的，不是 Knowledge，而是 7 层 Role Model

这是我觉得你这个项目最重要的结构升级。

一个 Agent 岗位最终应该得到：

```text
Role
│
├── 1. Mission
│
├── 2. Scope
│
├── 3. Responsibilities
│
├── 4. Competencies
│
├── 5. Know-how
│
├── 6. Decision Rules
│
└── 7. Boundaries & Collaboration
```

对应你的 Agent Team，就是：

| 层                | 回答的问题      | 最终用途                 |
| ---------------- | ---------- | -------------------- |
| Mission          | 为什么存在？     | Agent Goal           |
| Scope            | 管什么？不管什么？  | 权责边界                 |
| Responsibilities | 具体负责什么结果？  | Task Space           |
| Competencies     | 做好需要什么能力？  | Skills               |
| Know-how         | 专家实际上怎么做？  | Procedures           |
| Decision Rules   | 什么情况下怎么判断？ | Reasoning            |
| Boundaries       | 什么不能做、谁负责？ | Guardrails + Handoff |

这和传统 Job Description 最大的区别是：

> **JD 是招聘文档；Role Model 是 Agent 的操作系统。**

---

# 三、第一层不要马上研究“HR Director”，而要先建立 Occupation Model

你现在的思路里有一个非常好的动作：

> 先了解什么是 HR → 核心理论 → 再研究 HR Director 岗位。

这个应该正式化。

可以借鉴 O*NET 的做法。

O*NET 并不是只描述职位名称，而是把一个 occupation 分解成：

```text
Work Activities
Tasks
Knowledge
Skills
Abilities
Work Context
Experience
```

而且这些内容本身有层级化 taxonomy。([O*NET 资源中心][2])

所以你的第一步应该是：

```text
Occupation Model
        ↓
Role Model
        ↓
Agent Model
```

例如：

```text
Human Resources
│
├── HR Strategy
├── Organization
├── Talent
├── Performance
├── Compensation
├── Employee Relations
├── Learning & Development
├── HR Operations
├── HR Analytics
└── Labor / Compliance
```

然后再问：

> **HR Director 为什么需要这些？**

这里才开始进入 Role Distillation。

---

# 四、你的“资料池”应该至少分成 5 类，而不是混在一起搜

这是我建议你重点加入 Meta Skill 的地方。

## Source Layer 1：职业/理论知识

回答：

> 这个行业认为“优秀专家”应该知道什么？

例如 HR：

* SHRM
* O*NET
* CIPD
* 大学课程
* 教科书
* 专业研究

SHRM 的 Competency Model 就非常适合作为“理论先验”。

它将 HR 能力拆成：

* HR Expertise
* Leadership & Navigation
* Ethical Practice
* Relationship Management
* Communication
* Consultation
* Business Acumen
* Critical Evaluation
* Global & Cultural Effectiveness

并且明确区分 technical competency 与 behavioral competency。([SHRM][3])

最新的 SHRM BASK 还进一步定义了不同熟练度下的行为指标。([SHRM][4])

---

# 五、Source Layer 2：真实岗位市场

这是你提出的：

> Google、百度、Meta、Amazon、不同公司 JD

我非常赞成。

但建议不要仅仅：

> 搜 10 个 HR Director JD

而是采用：

## **Diversity Sampling**

至少覆盖：

```text
大型科技公司
↓
互联网平台
↓
制造
↓
传统企业
↓
创业公司
↓
跨国公司
↓
专业服务
```

并且覆盖：

```text
中国
美国
欧洲
```

这样才能识别：

### Universal

哪些职责跨行业都存在？

### Contextual

哪些职责只在某种组织出现？

### Company-specific

哪些只是某家公司自己的岗位设计？

例如：

```text
人才战略
组织设计
HR Strategy
```

可能是 Universal。

而：

```text
考勤
招聘执行
培训执行
Payroll
```

可能只是某些组织的 HR 泛职能岗位。

所以：

> **不要把 JD 中出现频率最高的词直接当作核心职责。**

这是一个非常重要的防错机制。

---

# 六、Source Layer 3：实践者 Know-how

这一层正是你提到：

> V2EX、人人都是产品经理、社区

我认为必须独立出来。

因为：

> **理论告诉你“应该是什么”，JD 告诉你“公司希望他是什么”，而社区实践告诉你“实际上怎么做”。**

三者不是一个东西。

例如 Product Manager：

理论可能告诉你：

```text
需求分析
产品战略
用户研究
```

JD 可能告诉你：

```text
负责产品规划
推进项目
协调研发
分析数据
```

而真实实践者可能告诉你：

```text
如何判断一个需求到底做不做
如何与老板博弈优先级
如何处理研发说做不了
如何用数据证明需求
如何做 MVP
```

这就是：

> **Know-how**

产品社区里的能力模型文章也往往会把工作内容进一步抽象成能力维度，例如《人人都是产品经理》中的产品经理能力模型。([人人都是产品经理][5])

所以你的 Source Taxonomy 最终应该：

```text
SOURCE
│
├── Theory
├── Occupation
├── Job Market
├── Practitioner
└── Case / Artifact
```

---

# 七、Source Layer 4：真实案例 / Artifact

这一类你目前还可以加强。

因为真正优秀的专家能力，往往不是写在文章里的，而是藏在：

```text
模板
决策表
流程
会议机制
KPI
Checklist
案例复盘
失败案例
Policy
Framework
```

比如 HR Director：

理论可能说：

> Strategic Workforce Planning

但一个真正可执行的 Skill，需要知道：

```text
业务预计增长 30%
        ↓
需要增加什么能力？
        ↓
Build / Buy / Borrow
        ↓
内部培养
外部招聘
contractor
AI automation
        ↓
成本 / 时间 / 风险比较
        ↓
人才配置方案
```

这已经开始变成：

> **Decision Model**

这才是 Agent 最需要的。

---

# 八、Source Layer 5：反例 / 争议 / 失败案例

我建议你正式加入这一层。

因为 LLM 最大的问题之一就是：

> 从大量“正确答案”里学出一个过度平均化的答案。

你之前谈 Deep Research Quality Loop 时其实已经触及这个问题。

所以不能只搜：

> “如何成为优秀 HR Director”

还必须搜：

```text
HR Director 常见失败
HR strategy failed
HR transformation failure
wrong hiring
organizational redesign failure
employee relations conflict
```

也就是：

> **Negative Evidence**

最终 Role Model 应该知道：

```text
Best Practice
+
Common Practice
+
Failure Pattern
+
Exception
```

---

# 九、然后才进入你说的“树状下钻”

这里我基本赞同你的方案，但我会把它正式定义为：

# Progressive Role Decomposition

不要一开始就建立 4 层树。

而是：

```text
Level 0
Role
 ↓
Level 1
Capability Domains
 ↓
Level 2
Responsibilities
 ↓
Level 3
Activities
 ↓
Level 4
Decision / Know-how
```

例如 HR Director：

```text
HR Director
│
├── Organization Strategy
│   ├── Org Design
│   │   ├── Team Structure
│   │   ├── Span of Control
│   │   └── Role Design
│   └── Workforce Planning
│       ├── Headcount Planning
│       ├── Talent Mix
│       └── Build/Buy/Borrow
│
├── Talent
│   ├── Acquisition
│   ├── Development
│   ├── Succession
│   └── Retention
│
├── Performance
│   ├── Goal System
│   ├── Evaluation
│   └── Incentives
│
...
```

但真正重要的是：

> **什么时候停止下钻？**

我的建议不是固定“最多 4 层”这么简单。

而是：

### Stop Rule

当某节点满足：

```text
有独立职责
+
有独立决策
+
有独立 Know-how
+
存在明显边界
```

才继续下钻。

否则停止。

这比机械四层更合理。

---

# 十、扎根理论应该用，但不要直接说“我们做 Grounded Theory”

这是一个很重要的学术/方法论修正。

你的场景更准确地说应该是：

> **Grounded-theory-inspired role synthesis**

或者：

> **Evidence-grounded role modeling**

因为经典 Grounded Theory 本身强调：

* simultaneous data collection & analysis
* constant comparison
* theoretical sampling
* memoing
* saturation

而且研究者应该让后续数据收集由当前 emerging categories 驱动。([CASRAI][1])

你的系统完全可以借用这些机制，但你实际上有大量**先验理论**：

```text
SHRM
O*NET
CIPD
已有岗位模型
```

因此不是纯粹从“零知识”开始建立理论。

所以我更建议：

> **Evidence-Grounded Role Distillation**

它比“扎根理论”更适合作为你的产品方法论名称。

---

# 十一、具体来说，可以把“扎根式蒸馏”设计成 6 个动作

## 1. Initial Coding

从 JD、文章、案例中抽取：

```text
responsibility
task
competency
knowledge
behavior
decision
tool
metric
risk
boundary
```

---

## 2. Constant Comparison

每出现一个新资料，就不断问：

```text
这个概念以前出现过吗？

如果出现：
    是同一个东西？
    只是不同叫法？
    还是不同层级？

如果没出现：
    是新能力？
    还是特殊案例？
```

这样可以避免：

```text
Recruitment
Talent Acquisition
Hiring
Staffing
```

最后变成四个“能力”。

---

# 十二、然后做 Category Formation

例如最终：

```text
招聘
├── Workforce planning
├── Talent sourcing
├── Selection
├── Employer branding
└── Hiring process
```

而不是：

```text
招聘
招聘管理
招聘策略
招聘规划
人才招聘
人才获取
...
```

也就是：

> **先碎片化，再概念收敛。**

这正是 grounded approach 中 open coding → category abstraction 的意义。([PubMed Central (PMC)][6])

---

# 十三、然后做 Theoretical Sampling

这会是你的 Meta Skill 很有价值的一步。

比如：

当前：

```text
HR Director
├── Talent
├── Organization
├── Performance
└── HR Operations
```

发现：

> “HR Operations”在不同公司差异特别大。

那么系统不能继续平均化。

应该自动提出：

```text
Evidence Gap:

HR Operations role boundary unclear.

Search next:
1. Startup HR Director
2. Enterprise CHRO
3. HRBP Director
4. Shared Services HR
5. Manufacturing HR Director
```

也就是：

> **哪里不确定，就往哪里搜索。**

而不是：

> “固定搜 20 篇”。

这就是 theoretical sampling 的价值。([CASRAI][1])

---

# 十四、然后做 Saturation，而不是“10条就够”

你提出：

> 至少 10 条左右

我建议改成：

> **10 条作为 minimum sampling seed，而不是 completion criterion。**

例如：

```text
10 JD
    ↓
得到 24 categories

继续搜索
    ↓
第 11~15 条没有新 category

继续搜索
    ↓
第 16~18 条开始出现新的边界差异

继续搜索

最终：
新资料连续 N 次
没有产生重要的新 category / property
```

才认为：

> **Category Saturation**

Grounded Theory 的 saturation 本来也不是一个固定样本数字，而是新材料不再实质改变类别属性和理论结构。([CASRAI][1])

所以：

> **10 是采样启动条件，不是“足够专业”的证明。**

---

# 十五、HITL 应该放在“角色树成熟以后”，而不是最后审批

你提到：

> 用户可以剪枝

这个设计我非常赞成，而且我认为这是你整个 Meta Skill 的一个核心机制。

但不要让用户看 300 条资料。

让用户只看：

```text
Emerging Role Tree
```

例如：

```text
HR Director
├── Organization Strategy       ✓
├── Workforce Planning          ✓
├── Talent Management            ✓
├── Compensation                 ✓
├── Learning & Development       ?
├── HR Operations                ×
├── Payroll                      ×
└── Employee Relations           ?
```

用户只需要：

> Keep / Remove / Merge / Delegate

这一步非常重要。

因为最终目标不是：

> 复原“所有 HR Director”。

而是：

> **定义你自己的 HR Director。**

换句话说：

```text
Public Role Model
       ↓
Evidence-based Candidate Model
       ↓
HITL Strategic Pruning
       ↓
Organization-specific Role
```

这个 distinction 很关键。

---

# 十六、你的 Agent Team 场景会让 Role Distillation 更进一步

你不是在做传统 HR。

你的最终目标是：

```text
CEO Agent
│
├── HR Director
│
│   ├── Role Architect
│   ├── Product Manager
│   ├── Engineer
│   ├── Designer
│   ├── Marketing
│   └── ...
│
├── Finance
├── Operations
└── ...
```

所以你最终需要的不是普通：

> HR Competency Model

而是：

# Agent Organization Model

每一个角色应该生成：

```yaml
role:
  mission:
  scope:
  responsibilities:
  authority:
  boundaries:

competencies:
  knowledge:
  skills:
  know_how:
  behaviors:

decision:
  principles:
  decision_rules:
  escalation_rules:

collaboration:
  reports_to:
  collaborates_with:
  handoffs:
  inputs:
  outputs:

tools:
  required:
  optional:

skills:
  required:
  optional:

memory:
  required_context:
  persistent_knowledge:

evaluation:
  success_metrics:
  failure_modes:
  test_cases:
```

这会直接对应你的 Agent runtime。

OpenAI 当前对 Agent 的基础定义也恰好是：

> Model + Tools + Instructions

而 OpenAI 和 Anthropic 都强调了 tools、guardrails、handoffs、evaluation，以及清晰边界的重要性。([OpenAI][7])

Anthropic 对工具的经验尤其值得你的架构吸收：工具应该有清晰边界、清晰命名、返回有意义且 token-efficient 的上下文，并通过 evaluation 持续优化。([Anthropic][8])

---

# 十七、因此我建议你的 Meta Skill 最终采用这个总架构

```text
                 ┌────────────────────┐
                 │  USER BUSINESS GOAL │
                 └─────────┬──────────┘
                           ↓
                   Role Definition
                           ↓
                ┌──────────────────────┐
                │ Evidence Acquisition │
                └──────────┬───────────┘
                           ↓
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
     Theory             Job Market        Practitioner
        ↓                  ↓                  ↓
        └──────────────────┼──────────────────┘
                           ↓
                  Evidence Ledger
                           ↓
                    Initial Coding
                           ↓
                   Category Tree
                           ↓
                 Constant Comparison
                           ↓
                  Gap / Conflict Map
                           ↓
                 Theoretical Sampling
                           ↺
                    until saturation
                           ↓
                  Role Model v0.8
                           ↓
                     HITL Pruning
                           ↓
                  Role Model v1.0
                           ↓
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
    Knowledge          Know-how         Decision Rules
        └──────────────────┼──────────────────┘
                           ↓
                 Boundary / Handoff
                           ↓
                 Capability Mapping
                           ↓
                    Tool Mapping
                           ↓
                    Skill Mapping
                           ↓
                Target Agent Skill
                           ↓
                     Eval Suite
                           ↓
                  Evaluator Loop
                           ↺
```

---

# 十八、最终我建议你的 Meta Skill 不再只有 5 个 Stage

我会重新定义为 **8 个阶段**：

| Stage | 名称                       | 核心产物                                               |
| ----- | ------------------------ | -------------------------------------------------- |
| 0     | Role Contract            | 角色目标、场景、组织上下文                                      |
| 1     | Evidence Acquisition     | 多源证据库                                              |
| 2     | Evidence Coding          | 原子事实、代码、source ledger                              |
| 3     | Role Structure Discovery | 角色树 / capability taxonomy                          |
| 4     | Comparative Distillation | 共性、差异、冲突、缺口                                        |
| 5     | Role Model Construction  | Mission / Responsibility / Competency / Know-how   |
| 6     | HITL Role Shaping        | 剪枝、合并、边界、组织适配                                      |
| 7     | Agent Compilation        | Prompt / Skills / Tools / Memory / Handoff / Evals |

但是注意：

**Stage 1～4 不是线性的。**

内部应该形成：

```text
Search
 ↓
Code
 ↓
Compare
 ↓
Gap
 ↓
Search again
 ↓
Code
...
```

直到 saturation。

---

# 十九、还应该增加一个你原来没有强调的核心产物：Evidence Ledger

我认为这会成为你整个系统质量的关键。

每一个重要结论都保留：

```text
Claim
Evidence
Source Type
Source
Frequency
Contradictions
Confidence
Reasoning
```

例如：

| Claim                    | Evidence       | Source       | Confidence |
| ------------------------ | -------------- | ------------ | ---------: |
| HRD需要参与组织设计              | 12/15 JD       | Job Market   |       High |
| HRD需要 Workforce Planning | SHRM + 8 JD    | Theory + Job |       High |
| HRD负责培训执行                | 5/15 JD        | Job Market   |     Medium |
| HRD必须负责 Payroll          | 2/15 JD        | Job Market   |        Low |
| HRD应该介入 CEO战略            | SHRM + 多个高管 JD | Theory + Job |       High |

这样最终 LLM 才不会：

> “因为我训练数据里感觉 HR 就是这样。”

而是：

> “这个结论来自 X 类证据，在 Y 个独立来源中出现，存在 Z 个例外。”

这就是你说的：

> **避免 LLM 先验知识平均化。**

---

# 二十、再往前一步：给每个知识设 Confidence

建议最终使用：

```text
Evidence Confidence

E0 = LLM prior only
E1 = single weak source
E2 = multiple weak sources
E3 = multiple independent sources
E4 = authoritative theory + market evidence
E5 = cross-source convergence + practitioner evidence
```

例如：

```text
HR Director → Business Acumen
E5

HR Director → Payroll execution
E1

HR Director → Learning & Development
E3

HR Director → Organization Design
E5
```

然后 Skill 可以规定：

> **E0/E1 信息不能作为强决策依据。**

这会非常适合你的 Deep Research + Agent Skill 体系。

---

# 二十一、最终的 Skill 不应该只有一个 Prompt

这是另外一个我建议你调整的地方。

你的 Stage 4 现在是：

> A. System Prompt
> B. Knowledge Base Outline

我觉得对于你的 Agent Organization，这是不够的。

最终应该输出：

```text
01_role.md
02_system_prompt.md
03_knowledge_map.md
04_capability_model.yaml
05_decision_rules.yaml
06_boundaries.yaml
07_handoff.yaml
08_tool_requirements.yaml
09_skill_requirements.yaml
10_memory_requirements.yaml
11_evaluation.md
12_evidence_ledger.jsonl
```

也就是说：

> **Meta Skill 不只是生成 Skill Prompt，而是生成一个“岗位包 Role Package”。**

Prompt 只是其中一部分。

---

# 二十二、这和你整个“虚拟组织”方向就完全接上了

最终：

```text
Business Goal
      ↓
CEO
      ↓
Organization Designer / HR Director
      ↓
Role Distillation
      ↓
Role Package
      ↓
┌─────────────┐
│ Role         │
│ Scope        │
│ Responsibility│
│ Authority    │
│ Skills       │
│ Tools        │
│ Memory       │
│ Handoff      │
│ Evaluation   │
└──────┬──────┘
       ↓
Agent
```

于是：

> **HR 不再只是“人事部门”。**

而变成：

> **AI Organization Architect**

这是非常适合你现在这个 Agent Team 产品方向的。

---

## 最终可以把整个方法论浓缩成一句话

> **不要从“写一个专家 Prompt”开始，而要从“研究这个角色在真实世界中如何被定义、如何工作、如何决策、如何与他人协作”开始；通过多源证据采集、编码、比较、理论采样、饱和、HITL 剪枝，构建 Role Model，再把 Role Model 编译成 Agent 的 Prompt、Skills、Tools、Memory、Handoff 和 Evals。**

而且这条路线与目前 Agent 工程实践是契合的：简单、模块化、清晰的 instructions/tools/boundaries，加上持续 evaluation，比堆复杂框架更可靠。([Anthropic][9])

**我认为你原来的 Meta Prompt 可以保留“Content Distillation Engine”这个名字，但内部方法论应该升级成 `Evidence-Driven Role Distillation Engine`。** 下一版不应该只是把原来的 5 Stage 改改文字，而应该把上面的 **Evidence Layer → Coding → Comparative Loop → Role Tree → HITL → Agent Compilation → Eval Loop** 真正写成可执行的 Meta Skill。

[1]: https://casrai.org/guides/grounded-theory-method?utm_source=chatgpt.com "Grounded Theory: Coding, Sampling & Saturation — CASRAI"
[2]: https://www.onetcenter.org/content.html?utm_source=chatgpt.com "The O*NET® Content Model at O*NET Resource Center"
[3]: https://www.shrm.org/topics-tools/news/organizational-employee-development/hr-competency-model-unveiled?utm_source=chatgpt.com "HR Competency Model Unveiled"
[4]: https://www.shrm.org/content/dam/en/shrm/credentials/shrm-certification/bask/shrm-bask.pdf?utm_source=chatgpt.com "BEHAVIORAL COMPETENCIES | LEADERSHIP CLUSTER | LEADERSHIP & NAVIGATION"
[5]: https://www.woshipm.com/share/6046708.html?utm_source=chatgpt.com "产品经理方法论连载04 | 产品通识——产品经理能力模型 | 人人都是产品经理"
[6]: https://pmc.ncbi.nlm.nih.gov/articles/PMC6318722/?utm_source=chatgpt.com "Grounded theory research: A design framework for novice researchers - PMC"
[7]: https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/?utm_source=chatgpt.com "A practical guide to building agents | OpenAI"
[8]: https://www.anthropic.com/engineering/writing-tools-for-agents?utm_source=chatgpt.com "Writing effective tools for AI agents—using AI agents \ Anthropic"
[9]: https://www.anthropic.com/engineering/building-effective-agents?utm_source=chatgpt.com "Building Effective AI Agents \ Anthropic"
