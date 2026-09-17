import json
from types import SimpleNamespace

from distill_agent.text import extract_candidate_ngrams, token_frequencies
from distill_agent.writer import normalize_skill_markdown, safe_name, write_skill
from distill_agent.graph import build_graph
from distill_agent.fetcher import build_dataset_from_urls
from distill_agent.config import Settings
from distill_agent.llm import LLMClient
from distill_agent.llm import parse_json_object
from distill_agent.prompts import SYSTEM, lexicon_prompt, map_prompt, reduce_prompt
from distill_agent.collector import classify_input, collect_input, create_run_dir
from distill_agent.profiles import list_profiles, load_profile


def test_candidate_ngrams_and_dictionary_tokenization():
    text = "新质生产力推动提质增效。新质生产力持续提质增效。"
    candidates = extract_candidate_ngrams(text)
    assert "新质生产力" in candidates
    assert token_frequencies(text, ["新质生产力", "提质增效"])["新质生产力"] == 2


def test_write_complete_skill(tmp_path):
    target = write_skill(
        {"name": "Gov Writing", "description": "test", "skill_md": "# Skill", "domain_lexicon_md": "# Terms"},
        tmp_path,
        2,
    )
    metadata = json.loads((target / "skill.json").read_text())
    assert target.name == "gov-writing"
    assert metadata["source_documents"] == 2
    assert all((target / ref).exists() for ref in metadata["references"])
    assert "反 AI 味" in (target / "references/anti_ai_style.md").read_text()
    assert "标题工作流" in (target / "references/title_patterns.md").read_text()
    assert "文章协作 SOP" in (target / "references/collaboration_sop.md").read_text()
    assert not (target / "references/narrative_style.md").exists()
    skill_md = (target / "SKILL.md").read_text()
    assert skill_md.startswith("---\nname: gov-writing\n")


def test_safe_name_rejects_empty():
    try:
        safe_name("///")
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError")


def test_safe_name_uses_lowercase_hyphens_only():
    assert safe_name("Gov_Writing V2") == "gov-writing-v2"
    try:
        safe_name("公文写作")
    except ValueError:
        pass
    else:
        raise AssertionError("non-ASCII name should be rejected")


def test_graph_runs_map_reduce_with_fake_llm():
    class FakeLLM:
        def ask_json(self, _system, user):
            if "审校候选词" in user:
                return {"terms": ["新质生产力"]}
            if "将 1 篇" in user:
                return {"name": "demo", "description": "demo", "skill_md": "# demo"}
            return {"cleaned_summary": "summary", "structures": [], "tone_style": [], "terms": [], "few_shots": []}

    state = build_graph(FakeLLM()).invoke({"documents": [{"doc_id": "a", "content": "新质生产力"}]})
    assert state["final"]["name"] == "demo"


def test_url_dataset_is_serial_and_retries(monkeypatch, tmp_path):
    url_file = tmp_path / "urls.txt"
    url_file.write_text("https://example.com/a\nhttps://example.com/b\n", encoding="utf-8")
    calls = []

    def fake_fetch(_client, _endpoint, url):
        calls.append(url)
        if url.endswith("/a") and calls.count(url) < 3:
            from distill_agent.fetcher import FetchError
            raise FetchError("temporary")
        return ("示例标题", "正文")

    monkeypatch.setattr("distill_agent.fetcher.fetch_url", fake_fetch)
    monkeypatch.setattr("distill_agent.fetcher.time.sleep", lambda _seconds: None)
    output, count, failures = build_dataset_from_urls(url_file, tmp_path / "dataset", "http://fetch")
    assert count == 2
    assert failures == []
    assert calls[:3] == ["https://example.com/a"] * 3
    assert calls[3:] == ["https://example.com/b"]
    assert len(list(output.glob("*.md"))) == 2


def test_url_dataset_reuses_manifest_cache(monkeypatch, tmp_path):
    url_file = tmp_path / "urls.txt"
    url_file.write_text("https://example.com/a\n", encoding="utf-8")
    calls = []

    def fake_fetch(_client, _endpoint, url):
        calls.append(url)
        return ("缓存标题", "缓存正文")

    monkeypatch.setattr("distill_agent.fetcher.fetch_url", fake_fetch)
    dataset = tmp_path / "dataset"
    build_dataset_from_urls(url_file, dataset, "http://fetch")
    build_dataset_from_urls(url_file, dataset, "http://fetch")
    assert calls == ["https://example.com/a"]


def test_llm_client_initializes_with_socks_proxy_support():
    client = LLMClient(Settings("test-key", "http://localhost/v1", "test-model", 0.2, "http://localhost/fetch"))
    assert client.settings.model == "test-model"
    assert client.settings.reasoning_effort == "high"
    assert client.settings.json_reasoning_effort == "none"
    assert client.settings.max_tokens == 24000
    assert client.settings.provider == "openai-compatible"
    assert client.settings.thinking_type == ""


def test_settings_use_generic_openai_compatible_env_names(monkeypatch, tmp_path):
    for key in ["OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL", "LLM_PROVIDER"]:
        monkeypatch.delenv(key, raising=False)
    env_file = tmp_path / ".env"
    env_file.write_text(
        "LLM_PROVIDER=custom\nOPENAI_API_KEY=key\nOPENAI_BASE_URL=http://localhost/v1\nOPENAI_MODEL=local-model\n",
        encoding="utf-8",
    )
    settings = Settings.from_env(env_file)
    assert settings.provider == "custom"
    assert settings.base_url == "http://localhost/v1"
    assert settings.model == "local-model"


def test_parse_json_object_handles_provider_prefix():
    assert parse_json_object("思考中... {\"terms\": [\"新质生产力\"]}") == {"terms": ["新质生产力"]}


def test_llm_request_uses_top_level_reasoning_effort(monkeypatch):
    settings = Settings("test-key", "http://localhost/v1", "test-model", 0.2, "http://localhost/fetch")
    client = LLMClient(settings)
    captured = {}

    def fake_create(**kwargs):
        captured.update(kwargs)
        message = SimpleNamespace(content='{"ok": true}', reasoning_content=None)
        return SimpleNamespace(choices=[SimpleNamespace(message=message, finish_reason="stop")])

    monkeypatch.setattr(client.client.chat.completions, "create", fake_create)
    assert client.ask_json("system", "user") == {"ok": True}
    assert captured["reasoning_effort"] == "none"
    assert captured["response_format"] == {"type": "json_object"}
    assert captured["max_tokens"] == 24000
    assert "extra_body" not in captured


def test_llm_retries_empty_json_content(monkeypatch):
    settings = Settings("test-key", "http://localhost/v1", "test-model", 0.2, "http://localhost/fetch")
    client = LLMClient(settings)
    calls = []

    def fake_create(**kwargs):
        calls.append(kwargs["messages"][-1]["content"])
        content = None if len(calls) == 1 else '{"ok": true}'
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=content, reasoning_content=None), finish_reason="stop")]
        )

    monkeypatch.setattr(client.client.chat.completions, "create", fake_create)
    assert client.ask_json("system", "user") == {"ok": True}
    assert len(calls) == 2
    assert "重试" in calls[1]


def test_prompt_templates_render_without_python_string_escaping():
    assert "合法 JSON" in SYSTEM
    assert '"新质生产力"' in lexicon_prompt(["新质生产力"])
    assert "文档 doc-1" in map_prompt("doc-1", "正文", ["术语"])
    assert "将 2 篇" in reduce_prompt(2, ["术语"], [])
    assert "{{" not in reduce_prompt(2, ["术语"], [])


def test_narrative_profile_has_evidence_based_dimensions(tmp_path):
    profile = load_profile("narrative")
    assert "narrative" in list_profiles()
    assert len(profile["narrative_dimensions"]) == 7
    prompt = map_prompt("doc-1", "正文", ["体验"], profile=profile)
    assert "narrative_style" in prompt
    assert "原文短片段" in prompt
    target = write_skill({"name": "Narrative", "description": "test", "skill_md": "# Skill"}, tmp_path, 2, profile="narrative")
    assert "叙事 Style Spec" in (target / "references/narrative_style.md").read_text()


def test_input_modes_and_stable_run_bundle(tmp_path):
    source = tmp_path / "docs"
    source.mkdir()
    (source / "a.md").write_text("正文", encoding="utf-8")
    assert classify_input(str(source)) == "directory"
    assert classify_input("https://example.com/a") == "url"
    url_file = tmp_path / "urls.txt"
    url_file.write_text("https://example.com/a\n", encoding="utf-8")
    assert classify_input(str(url_file)) == "url_file"
    first = create_run_dir(str(source), tmp_path / "runs")
    second = create_run_dir(str(source), tmp_path / "runs")
    assert first == second


def test_collect_can_append_to_existing_bundle(monkeypatch, tmp_path):
    calls = []

    def fake_fetch(_client, _endpoint, url):
        calls.append(url)
        return (url.rsplit("/", 1)[-1], f"正文 {url}")

    monkeypatch.setattr("distill_agent.fetcher.fetch_url", fake_fetch)
    run_dir = create_run_dir("https://example.com/first", tmp_path / "runs")
    collect_input("https://example.com/first", run_dir, "http://fetch")
    collect_input("https://example.com/second", run_dir, "http://fetch")
    manifest = json.loads((run_dir / "sources/_manifest.json").read_text())
    assert [entry["url"] for entry in manifest] == ["https://example.com/first", "https://example.com/second"]
    assert calls == ["https://example.com/first", "https://example.com/second"]




def test_skill_markdown_does_not_leak_json_protocol():
    content = "---\nname: wrong\n---\n必须返回 JSON。response_format=json_object。\n\n输出 Markdown 正文。"
    result = normalize_skill_markdown(content, "gov-writing", "公文写作")
    assert result.startswith("---\nname: gov-writing\n")
    assert "response_format" not in result
    assert "必须返回 JSON" not in result
    assert "输出 Markdown 正文" in result
