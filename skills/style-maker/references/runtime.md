# 运行手册

## 模型配置

在调用脚本的工作目录或传入的环境文件中配置：

```env
LLM_PROVIDER=openai-compatible
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.example.com/v1
OPENAI_MODEL=your-model
OPENAI_JSON_REASONING_EFFORT=none
OPENAI_MAX_TOKENS=24000
```

## 输入方式

```bash
# 已有 Markdown 目录
scripts/style-maker --input ./corpus --profile narrative --skill-name oma-life-writing

# 本地 URL 清单
scripts/style-maker collect --input ./urls.txt

# 单个 URL，使用本地采集后备
scripts/style-maker collect --input https://example.com/article
```

优先由 Agent 使用 web fetch 保存 Markdown 后再传目录；CLI 的 URL 采集需要本地 `FETCH_ENDPOINT`。

## 常用选项

| 选项 | 用途 |
|---|---|
| `--input` | Markdown 目录、URL 清单或单个 URL |
| `--profile` | `policy` 或 `narrative` |
| `--skill-name` | 生成 Skill 的合法名称 |
| `--run-dir` | 指定或复用一个 bundle 目录 |
| `--run-root` | 默认 bundle 根目录，默认为 `./runs` |
| `--refresh` | URL 采集时强制刷新指定页面 |
| `--dry-run` | 只创建资料和过程元数据，不调用模型 |

## 验收

```bash
test -f <run-dir>/run.json
test -f <run-dir>/skill/skill.json
```

读取 `run.json`，确认状态为 `completed`。读取 `skill/skill.json`，逐项确认 `references` 中的文件存在。
