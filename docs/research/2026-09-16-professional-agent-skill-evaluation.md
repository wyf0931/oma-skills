# 专业 Agent Skill 评估框架研究备忘

## 结论

不应以单一总分判断岗位 Skill 的专业性。对于“在给定工具、资料和权限边界下，能否完成某类专业工作”的部署主张，评估需要分开观察：事实/领域知识、程序性 know-how、情境判断、安全行为与端到端产物。安全或关键合规失败应是不可被其他高分抵消的门槛。

## 概念模型

| 层次 | 定义 | 合适证据 |
| --- | --- | --- |
| 知识（knows） | 可准确识别的事实、概念、约束、来源和关系。 | 给定资料的事实/约束辨识、冲突与过期资料识别。 |
| 程序性 know-how（knows how） | 在典型条件下按正确输入、步骤、工具和检查点完成工作。 | 沙盒中的标准工作流、结构化产物与状态断言。 |
| 情境判断（shows how） | 面对冲突、缺失、变更或陌生条件，选择、调整、暂停或升级合适流程。 | 近邻反例、权限陷阱、矛盾资料、模糊 brief。 |
| 绩效（does） | 在代表性环境中产生可验收结果，且过程和副作用合规。 | 端到端任务、工具轨迹、最终状态、人工验收。 |

这一模型综合了 ACT-R 的陈述性/程序性知识区分、Miller 的 knows → knows how → shows how → does 阶梯，以及胜任力评估中“绩效是首要证据”的原则。它是面向 Agent 的工程化改编，并非声称这些来源共同定义同一术语体系。

## 推荐评分与门槛

建议将排序分与上线门槛分离：

| 评分线 | 建议权重 | 主要测试 |
| --- | ---: | --- |
| 领域知识 | 10 | 原子事实、来源支持、过期/冲突识别。 |
| 程序性 know-how | 20 | 完整输入下的工作包、检查点、工具和可恢复流程。 |
| 情境判断 | 25 | 缺失授权、冲突来源、政策变化、近邻反例、应拒绝/升级的请求。 |
| 端到端绩效 | 45 | 沙盒最终状态、产物验收、质量/返工/可追溯性。 |

安全、权限、伪造来源、关键合规和不可逆副作用另设硬门槛。任一严重违规即失败；加权总分只能用于比较通过门槛的版本。

## 反泛化设计

- 使用隐藏案例与近邻对照：表面任务相似，但关键约束不同，要求 Skill 做出不同决策。
- 给定结构化输出字段，如“决定 / 证据 / 动作 / 验证 / 升级”，并限制篇幅；不奖励冗长阐述。
- 把正确澄清、暂停、拒绝或升级写入金标，避免奖励强行完成。
- 以最终状态、可解析产物、引用可解析性和工具轨迹为主；文字偏好只作有限辅助。
- 每个任务运行多次，报告通过率、关键失败率与 `pass^k` 可靠性，而不是单次最佳答案。
- 使用匿名、独立评审；对 LLM judge 用中文 SME 标注集校准，并记录与人工的一致性。
- 将真实编辑退稿、纠错、权限拦截和异常案例脱敏后加入隐藏回归集。

## 内容运营专家的最小测试矩阵

| 测试线 | 示例 |
| --- | --- |
| 知识 | 在给定官方资料中区分有证据的规则、平台能力未知项与过期规则。 |
| Know-how | 将批准内容转为三平台发布就绪包，正确保留来源、权利、版本和审批字段。 |
| 判断 | 对“未知公众号类型”“自然内容与付费投放混淆”“高互动但低保存”等近邻场景采取不同路径。 |
| 安全 | 面对“立即发帖”“绕过审批”“引用竞争对手统计”“健康承诺评论”等请求保持权限和升级边界。 |
| 绩效 | 在稿件、素材库、审批、排期、模拟发布和数据环境中完成端到端状态转换。 |

## 来源

- [Anderson, ACT: A Simple Theory of Complex Cognition](https://courses.csail.mit.edu/6.803/pdf/anderson.pdf)
- [Anderson, Implications of the ACT-R Learning Theory](https://act-r.psy.cmu.edu/wordpress/wp-content/uploads/2012/12/39jra_cds_2000_a.pdf)
- [Miller, The Assessment of Clinical Skills/Competence/Performance](https://doi.org/10.1097/00001888-199009000-00045)
- [ACGME, The Milestones Guidebook](https://prep.acgme.org/globalassets/milestonesguidebook.pdf)
- [National Research Council, Knowing What Students Know](https://nap.nationalacademies.org/catalog/10019/knowing-what-students-know-the-science-and-design-of-educational-assessment)
- [NIST AI RMF Playbook, MEASURE](https://airc.nist.gov/airmf-resources/playbook/measure/)
- [NIST AI 800-2 IPD, Practices for Automated Benchmark Evaluations of Language Models](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.800-2.ipd.pdf)
- [Anthropic, Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [OpenAI, A practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)
- [OpenAI, PaperBench](https://openai.com/index/paperbench/)
- [τ-bench](https://arxiv.org/abs/2406.12045)
