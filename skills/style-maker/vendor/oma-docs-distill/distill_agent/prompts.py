import json
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, StrictUndefined


_ENV = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "templates"),
    undefined=StrictUndefined,
    keep_trailing_newline=True,
    autoescape=False,
)
_ENV.filters["json_cn"] = lambda value: json.dumps(value, ensure_ascii=False)
_DEFAULT_PROFILE = {"name": "政策与公文", "map_focus": "", "content_rules": "", "style_rules": "", "writing_modes": [], "narrative_dimensions": []}


def render(template_name: str, **values: Any) -> str:
    return _ENV.get_template(template_name).render(**values).strip()


def lexicon_prompt(candidates: list[str], profile_description: str = "") -> str:
    return render("lexicon.j2", candidates=candidates, profile_description=profile_description)


def map_prompt(doc_id: str, content: str, top_words: list[str], metadata: dict[str, object] | None = None, profile: dict[str, object] | None = None) -> str:
    return render("map.j2", doc_id=doc_id, content=content, top_words=top_words, metadata=metadata or {}, profile=profile or _DEFAULT_PROFILE)


def reduce_prompt(doc_count: int, domain: list[str], maps: list[dict], profile: dict[str, object] | None = None) -> str:
    return render("reduce.j2", doc_count=doc_count, domain=domain, maps=maps, profile=profile or _DEFAULT_PROFILE)


SYSTEM = render("system.j2")
