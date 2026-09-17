import json
import hashlib
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from .fetcher import build_dataset_from_url_list, read_urls

URL_RE = re.compile(r"^https?://", re.IGNORECASE)


def classify_input(value: str) -> str:
    if URL_RE.match(value.strip()):
        return "url"
    path = Path(value)
    if path.is_dir():
        return "directory"
    if path.is_file() and path.suffix.lower() in {".txt", ".urls"}:
        return "url_file"
    raise ValueError(f"输入必须是 Markdown 目录、.txt/.urls URL 文件或 http/https URL: {value}")


def create_run_dir(input_value: str, runs_root: Path = Path("./runs"), run_dir: Path | None = None) -> Path:
    if run_dir:
        target = run_dir
    else:
        path = Path(input_value)
        stem = urlparse(input_value).netloc if URL_RE.match(input_value) else path.stem or path.name
        stem = re.sub(r"[^a-zA-Z0-9]+", "-", stem).strip("-").lower() or "distill"
        digest = hashlib.sha256(input_value.encode("utf-8")).hexdigest()[:8]
        target = runs_root / f"{stem}-{digest}"
    (target / "sources").mkdir(parents=True, exist_ok=True)
    (target / "process").mkdir(parents=True, exist_ok=True)
    (target / "skill").mkdir(parents=True, exist_ok=True)
    return target


def collect_input(input_value: str, run_dir: Path, endpoint: str, force_refresh: bool = False) -> tuple[Path, str, int, list[str]]:
    mode = classify_input(input_value)
    sources = run_dir / "sources"
    failures: list[str] = []
    if mode == "directory":
        source_dir = Path(input_value)
        files = sorted(source_dir.glob("*.md"))
        if not files:
            raise ValueError(f"输入目录没有 Markdown 文件: {source_dir}")
        for path in files:
            shutil.copy2(path, sources / path.name)
        manifest = [{"file": path.name, "source": str(path.resolve())} for path in files]
        (sources / "_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        count = len(files)
    else:
        urls = [input_value] if mode == "url" else read_urls(Path(input_value))
        _, count, failures = build_dataset_from_url_list(urls, sources, endpoint, force_refresh=force_refresh, preserve_existing=True)
    metadata = {
        "mode": mode,
        "input": input_value,
        "source_count": count,
        "failure_count": len(failures),
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }
    (run_dir / "process" / "collection.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return sources, mode, count, failures
