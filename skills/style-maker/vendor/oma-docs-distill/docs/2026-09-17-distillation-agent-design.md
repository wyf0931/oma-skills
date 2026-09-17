# 多文档 Skill 蒸馏 Agent 需求与架构指南

## 目标

将一个目录中的多份 Markdown 政策/公文材料，自动蒸馏为可维护、可移植的多文件 Agent Skill。产物包含 `skill.json`、`SKILL.md` 与七类 references：术语、句式结构、语气风格、标题体系、反 AI 味、文章协作 SOP、Few-Shot 校验示例。

## 用户流程

```text
uv run distill-agent --input ./data/policies --skill-name gov-writing
        |
        v
读取 Markdown -> 动态领域词典 -> 并行单文档 Map -> 全局 Reduce
        |
        v
./runs/<run-id>/{sources,process,skill,run.json}
```

## 核心设计

1. **输入与清洗**：只读取 `.md`，文件名作为稳定的 `doc_id`。清洗由 LLM 完成，要求去除日期、地点、具体人名、组织名等实体变量，同时保留逻辑主干；原始文件不改写。
2. **动态词典**：本地基于连续 2～8 字中文片段、频率和左右邻接自由度生成候选词，减少发送给模型的文本量。模型只返回 JSON 词汇列表，随后通过独立 Jieba `Tokenizer` 注入，避免修改全局进程词典。
3. **Map-Reduce**：LangGraph 使用 `Send` 将每篇文档发送到 Map 节点；Map 负责单篇四维抽取和本地词频；Reduce 负责跨文档汇总、去重和产物生成。Map 失败时记录文档级错误并继续，全部失败才终止。
4. **模型适配**：使用 OpenAI Python SDK 的 `OpenAI(api_key=..., base_url=...)`，面向任意 OpenAI-compatible Chat Completions Provider。Provider 名称只做标识，模型、地址和 key 均从 `.env`/环境变量读取。
5. **产物写入**：模型负责内容，Python 负责目录、JSON 元数据、文件名与原子写入。目录名由安全化后的 skill name 决定，防止路径穿越。
6. **协议隔离**：蒸馏 API 的外层响应使用 JSON 便于程序解析；`skill_md` 字段是最终面向用户的 Markdown 指令，不能继承 `response_format`、`json_object` 或“返回 JSON”等内部协议要求。Writer 统一补齐 YAML frontmatter。
7. **运行隔离**：URL 的 `_manifest.json` 只缓存网页采集结果；领域词库每次从当前完整资料重新构建并写入本次 bundle 的 `process/domain_dictionary.json`，不跨运行累积。
8. **Profile**：默认使用 `policy` profile；另提供通用 `narrative` profile。Profile 文件定义适用文体、内容抽取重点和表达规则；Map 结果分离为 `content_profile` 与 `style_profile`，`narrative` 额外输出七维叙事风格与原文证据，最终 Skill 以独立 reference 保存。

## 运行 Bundle

```text
runs/<run-id>/
├── sources/                 # 本次输入资料与采集 manifest
├── process/                 # 候选词、领域词库、Map 结果、采集元数据
├── skill/                   # skill.json、SKILL.md、references/
└── run.json                 # 输入模式、状态与产物索引
```

## 非目标

本版本不做 PDF/DOCX 解析、在线任务调度、向量数据库、Web 界面、自动发布和真实质量基准计算。后续若需要，可在 `DocumentLoader`、`LLMClient` 和 `SkillWriter` 边界上扩展。

## 验收标准

- `uv sync` 成功，`uv run pytest` 通过。
- `--help` 可用，输入目录不存在或没有 Markdown 时有清晰错误。
- `--dry-run` 不调用模型，能报告文档数量和候选词数量。
- 有 key 时一次命令生成完整 Skill 目录；无 key 时不泄漏敏感信息并明确提示。
- 生成的 `skill.json` 合法 JSON，引用文件全部存在，Markdown 可直接被 Agent 读取。
