import argparse
import json
import sys
from pathlib import Path

from .collector import collect_input, create_run_dir
from .config import Settings
from .graph import build_graph
from .llm import LLMClient
from .profiles import load_profile
from .text import extract_candidate_ngrams, extract_document_metadata, load_markdown_documents
from .writer import safe_name, write_skill


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="将多份 Markdown 文档蒸馏为多文件 Agent Skill")
    p.add_argument("--input", "-i", default="./data/policies", help="Markdown 目录、.txt/.urls URL 文件，或单个 http/https URL")
    p.add_argument("--skill-name", "-n", help="输出 skill 名称；不填则由模型生成")
    p.add_argument("--run-root", type=Path, default=Path("./runs"), help="运行 bundle 根目录")
    p.add_argument("--run-dir", type=Path, help="指定本次运行 bundle 目录；默认自动创建")
    p.add_argument("--output", "-o", type=Path, help=argparse.SUPPRESS)
    p.add_argument("--env-file", type=Path, default=Path(".env"), help="环境变量文件")
    p.add_argument("--dry-run", action="store_true", help="只检查输入并提取候选词，不调用模型")
    p.add_argument("--refresh", action="store_true", help="URL 输入时忽略已有 manifest，强制重新抓取")
    p.add_argument("--profile", default="policy", help="蒸馏 profile，默认 policy")
    return p


def collect_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="distill-agent collect", description="只采集资料，不调用模型")
    p.add_argument("--input", "-i", required=True, help="Markdown 目录、.txt/.urls URL 文件，或单个 http/https URL")
    p.add_argument("--run-root", type=Path, default=Path("./runs"), help="运行 bundle 根目录")
    p.add_argument("--run-dir", type=Path, help="指定本次采集 bundle 目录")
    p.add_argument("--env-file", type=Path, default=Path(".env"), help="环境变量文件")
    p.add_argument("--refresh", action="store_true", help="忽略已有采集缓存，强制重新抓取")
    return p


def _write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def collect_only(argv: list[str]) -> None:
    args = collect_parser().parse_args(argv)
    try:
        settings = Settings.from_env(args.env_file)
        run_dir = create_run_dir(args.input, args.run_root, args.run_dir)
        sources, mode, count, failures = collect_input(args.input, run_dir, settings.fetch_endpoint, args.refresh)
        _write_json(run_dir / "run.json", {"status": "collected", "mode": mode, "source_count": count, "failure_count": len(failures), "input": args.input})
        print(f"采集完成：{run_dir}")
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        raise SystemExit(f"错误: {exc}") from exc


def main() -> None:
    argv = sys.argv[1:]
    if argv and argv[0] == "collect":
        collect_only(argv[1:])
        return
    args = parser().parse_args(argv)
    try:
        settings = Settings.from_env(args.env_file)
        profile = load_profile(args.profile)
        run_root = args.output or args.run_root
        run_dir = create_run_dir(args.input, run_root, args.run_dir)
        input_dir, mode, count, failures = collect_input(args.input, run_dir, settings.fetch_endpoint, args.refresh)
        documents = load_markdown_documents(input_dir)
        candidates = extract_candidate_ngrams("\n".join(d["content"] for d in documents))
        print(f"读取 {len(documents)} 篇 Markdown，发现 {len(candidates)} 个候选词")
        _write_json(run_dir / "process" / "input.json", {"input": args.input, "mode": mode, "profile": profile["id"], "source_count": count, "failure_count": len(failures)})
        _write_json(run_dir / "process" / "candidates.json", {"terms": candidates})
        _write_json(
            run_dir / "process" / "document_metadata.json",
            [extract_document_metadata(d["doc_id"], d["content"], profile["default_article_type"]) for d in documents],
        )
        if args.dry_run:
            _write_json(run_dir / "run.json", {"status": "dry-run", "mode": mode, "profile": profile["id"], "source_count": count, "bundle": str(run_dir)})
            print("dry-run 完成，未调用模型")
            return
        print("全量模式：仅使用本次输入资料构建领域词库", flush=True)
        result = build_graph(LLMClient(settings), profile_name=profile["id"]).invoke({"documents": documents})
        _write_json(run_dir / "process" / "domain_dictionary.json", {"terms": result.get("domain_dictionary", [])})
        _write_json(run_dir / "process" / "map_results.json", {"documents": result.get("maps", [])})
        final = dict(result["final"])
        if args.skill_name:
            final["name"] = safe_name(args.skill_name)
        target = write_skill(final, run_dir / "skill", len(documents), profile=profile["id"])
        _write_json(run_dir / "run.json", {"status": "completed", "mode": mode, "profile": profile["id"], "source_count": count, "bundle": str(run_dir), "skill": str(target)})
        print(f"Skill 已生成: {target}")
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        raise SystemExit(f"错误: {exc}") from exc
