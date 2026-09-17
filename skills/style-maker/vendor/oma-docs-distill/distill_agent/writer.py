import json
import re
from pathlib import Path


INTERNAL_PROTOCOL_LINES = re.compile(
    r"(?im)^.*(?:response_format|json_object|内部通信协议|必须.*JSON|返回 JSON|输出.*JSON).*$\n?"
)

DEFAULT_ANTI_AI_STYLE = """# 反 AI 味写作规范

## 交稿前检查

- 默认不用中文冒号或英文冒号领起观点、标签和小标题，除非是网址、代码、元数据或原文不可改字段。
- 少用机械的“首先、其次、最后”“一是、二是、三是”，不要为了整齐强行凑三段或四段。
- 避免“值得注意的是”“更重要的是”“从某种意义上说”等空洞的洞察路标，直接说事实和判断。
- 谨慎使用“赋能、抓手、闭环、底座、引擎、升级”等抽象黑话。每个概念都要有具体动作、对象、结果或代价支撑。
- 不用“不是……而是……”等模板化翻案句，不用成串四字词、过度排比和每段同样的句式。
- 每个段落都要推进新的事实、动作、区别、因果或后果。不要换词重复同一个结论。
- 事实材料不足时缩短文章或先研究，不补造人物、数字、现场、引语和个人经历。
- 结尾讲完即止，不强行升华、总结全文或制造时代意义。

初稿完成后逐句检查标题、小标题、正文和结尾，并优先用普通、具体、自然的句子重写命中项。
"""

DEFAULT_COLLABORATION_SOP = """# 文章协作 SOP

1. 明确命题、读者、文体、篇幅、事实边界和交付形式。
2. 如果用户提供参考资料，先完整阅读并整理关键事实、来源、观点和可用细节。
3. 如果没有参考资料且题目依赖现实信息，使用可用的 web search/web fetch 工具搜集资料；资料较多时使用 subagent 隔离检索上下文，再汇总为资料库。
4. 基于资料库建立文章提纲，标注每个重要事实的来源；事实不足时缩小题目或说明限制。
5. 按 `syntax_templates.md` 和 `tone_style_guide.md` 完成初稿。新写文章要忠于资料，文章改写要保留原意、事实、语气目标和关键细节，不擅自补写事实。
6. 读取 `anti_ai_style.md` 做反 AI 味审校，再检查术语、结构、事实和篇幅。
7. 默认交付 Markdown 或纯文本文章正文，不输出内部 JSON、过程日志或无关的自我说明。
"""

DEFAULT_TITLE_PATTERNS = """# 标题与主题结构规范

标题不是正文的装饰。先从资料确认文章主题、政策对象、核心动作、目标和摘要，再为标题选择合适的概括层级。

## 标题工作流

1. 判断文章类型和读者，明确标题承担的是部署、总结、说明、经验推广还是问题分析功能。
2. 从主题和摘要中提炼总标题，确保总标题覆盖全文核心对象与动作，不把枝节当主旨。
3. 按正文的因果或叙事顺序安排一级标题。背景/问题、行动/机制、结果/目标之间的关系要能被读者看懂。
4. 继续拆分二级、三级标题。下级标题必须服务于上级标题，不能只是重新换一组口号。
5. 检查标题之间的并列、递进、因果和时间顺序，避免层级混乱、范围跳跃和标题与正文不一致。
6. 标题完成后再写正文，正文中的事实、段落和结论应能回扣对应标题。

## 反模式

- 不用标题堆砌抽象口号，标题至少指出对象、动作、问题或结果中的一项。
- 不为凑结构强行制造“一是、二是、三是”或完全同构的标题。
- 不让总标题说一个主题，摘要和分标题却转向另一个主题。
- 标题可以使用政策文体中的正常标点和对仗，但不能用形式整齐掩盖逻辑空洞。
"""

DEFAULT_CONTENT_PROFILE = """# 内容 Profile

记录本领域稳定的主题、政策对象、核心命题、事实边界、证据类型和因果关系。写作时先确认用户命题与这些内容规则的交集，不把风格规则当成事实，也不把样本中的具体事实直接搬入新文章。
"""

DEFAULT_STYLE_PROFILE = """# Style Profile

将表达拆成开头、结构、段落、语言、修辞、节奏、标题和结尾。规则应描述可观察的写法与适用条件，不把风格包装成作者人格。每次写作前按当前文体读取对应规则，并用 3～5 篇相近原文校准真实语感。
"""

DEFAULT_NARRATIVE_STYLE = """# 叙事 Style Spec

从故事素材、叙事结构、情绪、节奏、张力、留白和叙述者视角七个维度提炼风格。每条结论应关联跨文章的文档 ID 与简短证据，并区分硬规则、偏好和分歧；没有足够证据时明确标记为待验证。
"""


def safe_name(value: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    if not name:
        raise ValueError("skill name 必须包含至少一个 ASCII 字母或数字")
    return name


def normalize_skill_markdown(content: str, name: str, description: str) -> str:
    """Give the runtime a stable frontmatter contract and remove pipeline leakage."""
    body = content.strip()
    body = re.sub(r"\A---\s*\n.*?\n---\s*\n", "", body, count=1, flags=re.DOTALL)
    body = INTERNAL_PROTOCOL_LINES.sub("", body).strip()
    frontmatter = f"---\nname: {name}\ndescription: {json.dumps(description, ensure_ascii=False)}\n---\n"
    return frontmatter + "\n" + (body or "请根据用户需求撰写符合本 Skill 规范的文章。") + "\n"


def write_skill(result: dict, output_root: Path, source_count: int, profile: str = "policy") -> Path:
    raw_name = str(result.get("name", "distilled-skill"))
    try:
        name = safe_name(raw_name)
    except ValueError:
        name = "oma-distilled-writing"
    target = output_root / name
    refs = target / "references"
    refs.mkdir(parents=True, exist_ok=True)
    references = [
        "references/domain_lexicon.md",
        "references/content_profile.md",
        "references/style_profile.md",
        "references/syntax_templates.md",
        "references/tone_style_guide.md",
        "references/title_patterns.md",
        "references/anti_ai_style.md",
        "references/collaboration_sop.md",
        "references/validation_fewshot.md",
    ]
    if profile == "narrative":
        references.insert(3, "references/narrative_style.md")
    metadata = {
        "name": name,
        "version": "1.0.0",
        "description": result.get("description", "Distilled Agent Skill"),
        "profile": profile,
        "author": "Agentic Distillation Engine",
        "entrypoint": "SKILL.md",
        "source_documents": source_count,
        "references": references,
    }
    files = {
        "skill.json": json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        "SKILL.md": normalize_skill_markdown(
            str(result.get("skill_md", "# Distilled Skill\n")),
            name,
            str(result.get("description", "Distilled Agent Skill")),
        ),
        "references/domain_lexicon.md": result.get("domain_lexicon_md", "# Domain Lexicon\n"),
        "references/content_profile.md": result.get("content_profile_md") or DEFAULT_CONTENT_PROFILE,
        "references/style_profile.md": result.get("style_profile_md") or DEFAULT_STYLE_PROFILE,
        "references/syntax_templates.md": result.get("syntax_templates_md", "# Syntax Templates\n"),
        "references/tone_style_guide.md": result.get("tone_style_guide_md", "# Tone & Style\n"),
        "references/title_patterns.md": result.get("title_patterns_md") or DEFAULT_TITLE_PATTERNS,
        "references/anti_ai_style.md": result.get("anti_ai_style_md") or DEFAULT_ANTI_AI_STYLE,
        "references/collaboration_sop.md": result.get("collaboration_sop_md") or DEFAULT_COLLABORATION_SOP,
        "references/validation_fewshot.md": result.get("validation_fewshot_md", "# Validation Few-Shot\n"),
    }
    if profile == "narrative":
        files["references/narrative_style.md"] = result.get("narrative_style_md") or DEFAULT_NARRATIVE_STYLE
    for relative, content in files.items():
        path = target / relative
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(str(content).strip() + "\n", encoding="utf-8")
        tmp.replace(path)
    return target
