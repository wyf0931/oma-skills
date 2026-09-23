# 案例 5：团队技术分享——Agent 执行循环（Agent Loop）设计原理

- **场景分类：** 内部技术分享 / 团队培训 / 知识沉淀
- **受众定位：** 初中级开发者（Context Gap 小、Attention Budget 高，愿意跟着推导，但没耐心被术语轰炸）
- **动态 SOP 路径：**
  - **Step 0：** 事实完整（技术原理、代码 Demo、架构图齐备），无需补齐。
  - **Step 1：** **IPO**（拆解输入的 Task、中间的 Agent 循环、输出的结果）
  - **Step 2：** **ADEPT**（Analogy → Diagram → Example → Plain English → Technical）
  - **Step 3：** **ELI5 + KISS 分段切换**（前段降维类比，后段专业精确）

---

### 最终渲染输出（Rendered Output）

**【Analogy — 类比】**
Agent 的工作机制，非常像一个“配有秘书的经理”：

- 经理（LLM）负责思考和做决定：“接下来要去订张机票”；
- 秘书（Tool Router）负责跑腿：“去打开浏览器调用 API”；
- 跑完腿把结果回传给经理，经理再决定下一步。

**【Diagram — 结构拆解图】**

```text
[ User Task ] ➔ [ LLM Reasoner ] ➔ [ Action Call ] ➔ [ Tool Engine ]
                       ▲                                   │
                       └────────── [ Observation ] ────────┘
```

**【Example — 代码逻辑】**

```python
while not task_completed:
    thought, action = llm.think(history)
    observation = execute_tool(action)
    history.append(thought, action, observation)
```

**【Plain English — 通俗总结】**
简而言之：Agent = 大脑思考 + 工具调用 + 观察反馈，不断循环直到任务结束。

**【Technical Details — 底层细节】**
在并发场景下，核心要解决 ReAct 循环中的 Context Window 爆满问题，需引入 Dynamic Pruning 与 Head-Tail Window 策略，并对 Observation 做摘要压缩而不是简单截断。

---

### 本例的可复用点

- **先类比再术语：** 听众在“秘书/经理”这个挂靠点上接收后面的 ReAct 循环，理解成本大幅下降；顺序颠倒则每个字都认识、连起来不懂。
- **渲染模式可以按段落切换，但不能在一段内混：** 前段 ELI5、后段 KISS 是对同一批受众做渐进式交付；如果一段里既有“像给经理跑腿的秘书”又出现 `Context Window` 而不解释，读者就不知道该用什么颗粒度理解。
- **ADEPT 不要求五段等长：** 分享时间有限时，可以砍 Diagram，但 Analogy 和 Plain English 不能砍——它们承担“进门”和“落地”两个不可替代的功能。
