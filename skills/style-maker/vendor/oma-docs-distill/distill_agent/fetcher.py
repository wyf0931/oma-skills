import json
import re
import time
from pathlib import Path
from urllib.parse import urlparse

import httpx


class FetchError(RuntimeError):
    """Raised when the local content fetch service returns an unusable result."""


def read_urls(path: Path) -> list[str]:
    if not path.exists():
        raise FileNotFoundError(f"URL 文件不存在: {path}")
    urls = []
    for line in path.read_text(encoding="utf-8").splitlines():
        value = line.strip()
        if value and not value.startswith("#"):
            if not value.startswith(("http://", "https://")):
                raise ValueError(f"URL 格式无效: {value}")
            urls.append(value)
    if not urls:
        raise ValueError(f"URL 文件没有有效链接: {path}")
    return urls


def safe_filename(title: str, fallback_url: str, used: set[str]) -> str:
    value = re.sub(r"[\\/:*?\"<>|\r\n]+", " ", title).strip(" .")
    if not value:
        value = urlparse(fallback_url).netloc or "document"
    value = value[:120]
    base = value
    index = 2
    while value in used:
        value = f"{base}-{index}"
        index += 1
    used.add(value)
    return value + ".md"


def fetch_url(client: httpx.Client, endpoint: str, url: str) -> tuple[str, str]:
    try:
        response = client.post(
            endpoint,
            params={"persist": "true"},
            json={"url": url, "output_format": "markdown", "timeout_seconds": 90},
        )
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError, json.JSONDecodeError) as exc:
        raise FetchError(f"抓取失败 {url}: {exc}") from exc
    if payload.get("code") != 0 or not isinstance(payload.get("data"), str) or not payload["data"].strip():
        raise FetchError(f"抓取服务返回异常 {url}: {payload.get('message', 'missing data')}")
    title = str(payload.get("meta", {}).get("page", {}).get("title") or "").strip()
    return title, payload["data"]


def build_dataset_from_urls(
    url_file: Path,
    output_dir: Path,
    endpoint: str,
    max_retries: int = 3,
    force_refresh: bool = False,
) -> tuple[Path, int, list[str]]:
    urls = read_urls(url_file)
    return build_dataset_from_url_list(urls, output_dir, endpoint, max_retries, force_refresh)


def build_dataset_from_url_list(
    urls: list[str],
    output_dir: Path,
    endpoint: str,
    max_retries: int = 3,
    force_refresh: bool = False,
    preserve_existing: bool = True,
) -> tuple[Path, int, list[str]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    used: set[str] = set()
    failures: list[str] = []
    manifest: list[dict[str, str]] = []
    skipped_count = 0
    manifest_path = output_dir / "_manifest.json"
    cached: dict[str, dict[str, str]] = {}
    if not force_refresh and manifest_path.exists():
        try:
            entries = json.loads(manifest_path.read_text(encoding="utf-8"))
            cached = {entry["url"]: entry for entry in entries if entry.get("url") and entry.get("file")}
        except (OSError, json.JSONDecodeError, TypeError):
            print(f"警告: 缓存 manifest 无法读取，将重新抓取: {manifest_path}")
    if preserve_existing and manifest_path.exists():
        try:
            existing = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest = [entry for entry in existing if entry.get("url") and entry.get("file")]
        except (OSError, json.JSONDecodeError, TypeError):
            pass
    existing_by_url = {entry["url"]: entry for entry in manifest}
    used.update(Path(entry["file"]).stem for entry in manifest)
    # The configured service is local; ignore ambient HTTP(S)_PROXY/SOCKS settings.
    with httpx.Client(timeout=100.0, follow_redirects=True, trust_env=False) as client:
        for url in urls:
            cache_entry = cached.get(url)
            if cache_entry:
                cached_file = output_dir / cache_entry["file"]
                if cached_file.is_file() and cached_file.stat().st_size > 0:
                    used.add(cached_file.name.removesuffix(".md"))
                    if cache_entry not in manifest:
                        manifest.append(cache_entry)
                    skipped_count += 1
                    continue
            result: tuple[str, str] | None = None
            last_error: FetchError | None = None
            for retry_index in range(max_retries + 1):
                try:
                    result = fetch_url(client, endpoint, url)
                    break
                except FetchError as exc:
                    last_error = exc
                    if retry_index < max_retries:
                        print(f"重试 {retry_index + 1}/{max_retries}: {url}")
                        time.sleep(min(retry_index + 1, 3))
            try:
                if result is None:
                    raise last_error or FetchError(f"抓取失败: {url}")
                title, content = result
                old_entry = existing_by_url.get(url)
                if old_entry:
                    used.discard(Path(old_entry["file"]).stem)
                filename = old_entry["file"] if old_entry else safe_filename(title, url, used)
                (output_dir / filename).write_text(content.strip() + "\n", encoding="utf-8")
                manifest = [entry for entry in manifest if entry["url"] != url]
                manifest.append({"file": filename, "title": title, "url": url})
                print(f"已抓取: {title or url} -> {filename}")
            except FetchError as exc:
                failures.append(str(exc))
                print(f"警告: {exc}")
    if skipped_count:
        print(f"已复用缓存：{skipped_count} 篇")
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if not manifest:
        raise FetchError("所有 URL 均抓取失败")
    return output_dir, len(manifest), failures
