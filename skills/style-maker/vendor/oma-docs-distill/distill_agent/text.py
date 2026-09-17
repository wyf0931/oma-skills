from collections import Counter
import math
import re
from pathlib import Path

import jieba

CHINESE = re.compile(r"[\u4e00-\u9fff]+")
DATE = re.compile(r"(?:20\d{2}[-年]\d{1,2}[-月]\d{1,2}日?|20\d{2}年\d{1,2}月)")
HEADING = re.compile(r"^(#{1,3})\s+(.+?)\s*$", re.MULTILINE)


def load_markdown_documents(input_dir: Path) -> list[dict[str, str]]:
    if not input_dir.exists():
        raise FileNotFoundError(f"输入目录不存在: {input_dir}")
    paths = sorted(input_dir.glob("*.md"))
    if not paths:
        raise ValueError(f"输入目录没有 Markdown 文件: {input_dir}")
    return [{"doc_id": p.stem, "content": p.read_text(encoding="utf-8")} for p in paths]


def extract_candidate_ngrams(text: str, top_n: int = 120) -> list[str]:
    """Small, dependency-free new-word candidate finder for Chinese material."""
    chars = "".join(CHINESE.findall(text))
    counts: Counter[str] = Counter()
    for n in range(2, 9):
        counts.update(chars[i : i + n] for i in range(len(chars) - n + 1))
    # Penalize very long strings and prefer repeated, locally meaningful chunks.
    scored = [(word, freq * math.log2(len(word) + 1)) for word, freq in counts.items() if freq >= 2]
    scored.sort(key=lambda item: (item[1], len(item[0])), reverse=True)
    selected: list[str] = []
    for word, _ in scored:
        if any(word in existing or existing in word for existing in selected):
            continue
        selected.append(word)
        if len(selected) >= top_n:
            break
    return selected


def token_frequencies(text: str, domain_dictionary: list[str]) -> Counter[str]:
    tokenizer = jieba.Tokenizer()
    for word in domain_dictionary:
        tokenizer.add_word(word)
    return Counter(word.strip() for word in tokenizer.cut(text) if len(word.strip()) >= 2)


def extract_document_metadata(doc_id: str, content: str, article_type: str = "文章") -> dict[str, object]:
    headings = [{"level": len(markers), "title": title} for markers, title in HEADING.findall(content)]
    title = next((item["title"] for item in headings if item["level"] == 1), doc_id)
    return {
        "title": title,
        "date": next(iter(DATE.findall(content)), ""),
        "article_type": article_type,
        "topic_tags": [],
        "hook_type": "待判断",
        "structure_pattern": "待判断",
        "source_types": [],
        "word_count": len(content),
        "heading_count": len(headings),
        "headings": headings,
    }
