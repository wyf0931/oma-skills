# oma-docs-distill

将多份中文 Markdown 政策/公文材料自动蒸馏为可维护的多文件 Agent Skill。项目采用 LangGraph 编排，使用 OpenAI Python SDK 调用任意 OpenAI-compatible Provider。

## 快速开始

需要 Python 3.11+ 和 [uv](https://docs.astral.sh/uv/)。

```bash
uv sync
cp .env.example .env
# 编辑 .env，填写 OPENAI_API_KEY、OPENAI_BASE_URL 和 OPENAI_MODEL

mkdir -p data/policies
cp examples/*.md data/policies/
uv run distill-agent --input ./data/policies --skill-name gov-writing
```

每个输入对应一个可复用的 bundle，默认位于 `./runs/<input-slug>-<input-hash>/`：

```text
runs/<run-id>/
├── sources/                 # 本次输入资料与 _manifest.json
├── process/                 # input、候选词、词库、Map 结果
├── skill/                   # skill.json、SKILL.md、references/
└── run.json                 # 本次运行索引与状态
```

## CLI

Skill 名称遵循运行时规范，只能包含小写 `a-z`、数字和连字符 `-`，例如 `oma-policy-writing`。输入的空格、下划线和其他分隔符会规范化为连字符；无法转换的模型名称会回退为 `oma-distilled-writing`。

```bash
uv run distill-agent --help
uv run distill-agent                         # 默认读取 ./data/policies
uv run distill-agent -i ./data/xxx -n my-skill
uv run distill-agent -i ./data/test-1.txt # URL 清单，自动抓取并生成 ./data/test-1/
uv run distill-agent -i ./data/test-1.txt --refresh # 忽略缓存，强制重新抓取
uv run distill-agent -i ./data/xxx --dry-run # 不调用模型，检查输入和候选词
uv run distill-agent -i ./data/xxx --profile policy # 使用政策蒸馏 profile（默认）
uv run distill-agent -i ./data/life --profile narrative # 使用通用叙事/公众号文章 profile
uv run distill-agent collect -i ./data/test-1.txt # 只采集资料，不调用模型
uv run distill-agent collect -i https://example.com/article # 只采集一个 URL
```

模型配置使用通用的 OpenAI-compatible 变量：`OPENAI_API_KEY`、`OPENAI_BASE_URL` 和 `OPENAI_MODEL`。`LLM_PROVIDER` 只用于标识 Provider，不参与请求路由。任何兼容 OpenAI Chat Completions 的服务都可以通过这三个变量切换。

普通请求默认使用 `reasoning_effort=high`。由于部分 Provider 不建议同时开启 thinking 和 JSON mode，蒸馏的结构化请求默认单独使用 `OPENAI_JSON_REASONING_EFFORT=none`，保证 JSON 输出稳定；如确实需要联合使用，可显式改为 `high`。参数使用正确拼写 `reasoning_effort`。

对于 DeepSeek 等兼容接口，若要显式开启 thinking，可设置 `OPENAI_THINKING_TYPE=enabled`；结构化 JSON 蒸馏请求默认不发送 thinking body。

所有蒸馏请求都要求 Provider 返回 JSON（`response_format=json_object`），并默认设置 `max_tokens=24000`，可通过 `OPENAI_MAX_TOKENS` 调整。

从旧配置迁移时，将 `SENSENOVA_API_KEY`、`SENSENOVA_BASE_URL`、`SENSENOVA_MODEL` 等变量分别改名为对应的 `OPENAI_*` 变量。当前版本暂时保留旧变量 fallback，便于平滑迁移；新配置不应再使用 Provider 专属变量。

### URL 清单输入

`--input` 支持三种输入：Markdown 目录、`.txt`/`.urls` URL 文件，或单个 `http://`/`https://` 链接。`.txt`/`.urls` 文件每行一个链接，空行和 `#` 开头的行会忽略：

```text
# data/test-1.txt
https://example.com/article-a
https://example.com/article-b
```

`collect` 命令只执行上述采集，不初始化模型或 LangGraph。普通 `distill-agent` 会先执行同样的采集，再继续蒸馏。程序会串行调用本地 fetch 服务 `http://127.0.0.1:7890/api/fetch?persist=true`，请求 Markdown 格式，提取响应中的 `data` 保存为 Markdown；文件名使用 `meta.page.title`，同时在本次 bundle 的 `sources/` 中生成 `_manifest.json` 保存来源 URL。再次使用同一个输入时会复用该 bundle 中的有效 Markdown，避免重复抓取；`process/` 与 `skill/` 则按本次输入重新生成。需要更新指定 URL 时使用 `--refresh`；需要向已有 bundle 追加新的 URL 时，指定已有的 `--run-dir`，旧资料和 manifest 会保留；需要完全新建 bundle 时指定一个新的 `--run-dir`。服务地址可用 `FETCH_ENDPOINT` 覆盖。

例如继续向已有 bundle 追加一篇文章：

```bash
uv run distill-agent collect \
  --input https://example.com/another-article \
  --run-dir runs/www-cac-gov-cn-2b7fad13
```

### 缓存与运行隔离

两类持久化数据含义不同：

| 文件 | 用途 | 默认行为 |
|---|---|---|
| `sources/_manifest.json` | URL → Markdown 文件的抓取缓存 | 默认读取并复用，避免重复抓网页 |
| `process/domain_dictionary.json` | 本次运行由已配置模型审校的领域词库 | 每次运行重新生成 |

领域词库不跨运行累积。需要更新词库时，直接使用当前完整资料重新运行；URL 抓取缓存仍由 `_manifest.json` 独立管理。

## 流程

1. Phase 0：本地提取连续中文 N-gram 候选词，交给模型审校并形成动态领域词典。
2. Map：LangGraph 将每篇文档分发到节点，完成实体变量清洗、句式与结构、语气风格、领域术语和 Few-Shot 抽取，并用注入词典的 Jieba 做本地词频统计。
3. Reduce：按 profile 融合跨文档结果，生成 Skill 主指令和九份基础 reference；`narrative` 额外生成带证据的 `narrative_style.md`，用于叙事七维风格规约。
4. Writer：Python 校验名称、创建目录并原子写入文件。

每次运行只使用当前输入资料，全量重新构建领域词库，并将结果写入本次 bundle 的 `process/domain_dictionary.json`。

当前提供两个 profile：`policy` 用于政策、公文、工作部署、总结报告、调研材料和新闻通讯；`narrative` 用于公众号长文、生活方式、个人经验、非虚构故事和文化观察。Profile 会约束内容字段、风格字段、标题关系和适用写作场景，后续可以新增其他领域而不改 LangGraph 主流程。

## 开发

```bash
uv run pytest
```

完整需求与架构边界见 [`docs/2026-09-17-distillation-agent-design.md`](docs/2026-09-17-distillation-agent-design.md)。
当前系统流程、状态图和待补齐环节见 [`docs/system-flow.md`](docs/system-flow.md)。
