# 多文档 Skill 蒸馏 Agent：系统流程与状态

本文档描述当前代码已经实现的流程，并单独列出尚未实现的能力。

每个输入对应一个可复用的 `runs/<input-slug>-<input-hash>/` bundle，采集资料位于 `sources/`，蒸馏过程数据位于 `process/`，最终 Skill 位于 `skill/`。同一输入再次运行会复用有效采集缓存并重新生成蒸馏结果；整个 bundle 可直接打包归档。

## 1. 总体流程

```mermaid
flowchart TD
    A[distill-agent CLI] --> B{输入类型}
    B -->|Markdown 目录| C[读取 *.md]
    B -->|urls.txt / .urls| D[读取 URL 清单]
    D --> E{manifest 中已有且文件非空?}
    E -->|是| F[复用本地 Markdown]
    E -->|否| G[串行调用本地 fetch 服务]
    G --> H{请求成功?}
    H -->|否| I[等待并重试]
    I -->|最多 3 次重试| G
    I -->|仍失败| J[记录警告并继续下一个 URL]
    G --> K[提取 data + page.title]
    K --> L[保存标题.md + _manifest.json]
    F --> M[Dataset Ready]
    L --> M
    C --> M
    M --> N[Phase 0：N-gram 候选词发现]
    N --> O[已配置模型审校领域词表]
    O --> P[Jieba 独立 Tokenizer 注入词表]
    P --> Q[LangGraph Send Map]
    Q --> R[逐篇逆向蒸馏]
    R --> S[Reduce 全局融合]
    S --> T[结构化 JSON 内容对象]
    T --> U[Writer 补 frontmatter]
    U --> V[写入 bundle/skill/]
```

`_manifest.json` 是网页抓取缓存，只负责避免重复下载，不会影响领域词库。

## 2. LangGraph 状态图

```mermaid
stateDiagram-v2
    [*] --> InputReady: CLI 读取输入
    InputReady --> DatasetReady: Markdown 目录
    InputReady --> CollectingURLs: URL 清单
    CollectingURLs --> CacheHit: manifest 命中文件有效
    CollectingURLs --> Fetching: 缓存未命中或 --refresh
    Fetching --> Fetching: 失败，重试 1~3 次
    Fetching --> DatasetReady: 成功保存 data
    Fetching --> PartialFailure: 单 URL 最终失败
    PartialFailure --> Fetching: 继续下一个 URL
    CacheHit --> DatasetReady
    DatasetReady --> LexiconBootstrap: 提取候选 N-gram
    LexiconBootstrap --> LexiconReady: 模型审校完成
    LexiconReady --> Mapping: Jieba 注入领域词表
    Mapping --> Mapping: Send 并行处理其他文档
    Mapping --> Reducing: Map 结果汇聚
    Reducing --> SkillObjectReady: 模型返回结构化 JSON
    SkillObjectReady --> Writing: Writer 生成 frontmatter
    Writing --> Completed: Skill 文件包写入完成
    LexiconBootstrap --> Failed: 模型请求失败
    Reducing --> Failed: 模型请求失败
    Failed --> [*]
    Completed --> [*]
```

## 3. URL 采集状态

```mermaid
sequenceDiagram
    participant CLI
    participant Manifest as _manifest.json
    participant Fetch as Local Fetch Service
    participant Disk as Dataset Directory

    CLI->>Manifest: 读取 URL → file 映射
    alt file 存在且非空，且未 --refresh
        Manifest-->>CLI: Cache Hit
        CLI->>Disk: 复用 Markdown
    else 缓存未命中
        loop 首次请求 + 最多重试 3 次
            CLI->>Fetch: POST /api/fetch?persist=true
            Fetch-->>CLI: code, data, meta.page.title
        end
        CLI->>Disk: 保存 title.md
        CLI->>Manifest: 更新 url/title/file
    end
```

## 4. 当前完成度

### 已实现

- CLI 参数解析与 `--dry-run`
- Markdown 目录输入
- URL 清单输入
- 串行采集、缓存复用、`--refresh`
- 单 URL 最多重试 3 次
- `data`、`meta.page.title` 和 `_manifest.json` 持久化
- N-gram 候选词发现
- 已配置模型动态领域词表审校
- Jieba 独立词典注入
- 每次从当前完整资料重新构建领域词库，不跨运行累积
- `_manifest.json` 默认复用；领域词库写入本次 bundle 的 `process/domain_dictionary.json`
- LangGraph `Send` Map-Reduce
- JSON mode、`max_tokens`、`reasoning_effort`
- Skill frontmatter、`skill.json` 与九类基础 reference 输出，包含内容/风格分层、标题体系、反 AI 味和协作 SOP；`narrative` Profile 额外输出七维叙事风格 reference

### 尚待补齐

- 单次运行的 checkpoint / resume
- LLM 请求缓存，避免重复蒸馏同一批材料
- token、耗时、费用统计
- Skill 生成后的自动质量评分
- 增量蒸馏与新旧 Skill diff
- 失败任务的持久化状态和可重跑队列
- Few-Shot 生成结果的自动回测闭环
- 文件级读写工具注册。目前文件读写由 Python `Path` 完成，不是 LangChain Tool。

## 5. 关键边界

```text
外层模型响应：JSON —— 供 Python / LangGraph 解析
Skill.md 内容：Markdown —— 供最终写作 Agent 使用
```

两者必须保持隔离。最终生成的政策材料应是 Markdown/纯文本正文，不应继承 `response_format=json_object`、`reasoning_effort` 或内部通信协议。
