#!/usr/bin/env python3
"""Build a plain-text transcript and compact metadata JSON from yt-dlp files."""

from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from typing import Any


TIMESTAMP = re.compile(
    r"(?P<start>\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*"
    r"(?P<end>\d{2}:\d{2}:\d{2}[,.]\d{3})"
)
TAG = re.compile(r"<[^>]+>")
INDEX = re.compile(r"^\d+$")


def seconds(value: str) -> float:
    hours, minutes, remainder = value.replace(",", ".").split(":")
    return int(hours) * 3600 + int(minutes) * 60 + float(remainder)


def parse_srt(path: Path) -> list[tuple[float, str]]:
    content = path.read_text(encoding="utf-8-sig")
    cues: list[tuple[float, str]] = []

    for block in re.split(r"\n\s*\n", content.replace("\r\n", "\n").replace("\r", "\n")):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        timing_index = next((i for i, line in enumerate(lines) if TIMESTAMP.search(line)), None)
        if timing_index is None:
            continue
        match = TIMESTAMP.search(lines[timing_index])
        assert match is not None
        text_lines = lines[timing_index + 1 :]
        text = " ".join(text_lines)
        text = text.replace(r"\N", " ").replace(r"\n", " ")
        text = html.unescape(TAG.sub("", text))
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            cues.append((seconds(match.group("start")), text))

    # Avoid duplicate captions commonly repeated across adjacent subtitle cues.
    deduplicated: list[tuple[float, str]] = []
    previous = ""
    for start, text in cues:
        if text != previous:
            deduplicated.append((start, text))
        previous = text
    return deduplicated


def build_plain_text(cues: list[tuple[float, str]]) -> str:
    paragraphs: list[str] = []
    current = ""
    previous_start: float | None = None

    for start, text in cues:
        if current and previous_start is not None and start - previous_start > 1.5:
            paragraphs.append(current)
            current = text
        else:
            current = f"{current} {text}".strip()
        previous_start = start

    if current:
        paragraphs.append(current)
    return "\n\n".join(paragraphs).strip() + ("\n" if paragraphs else "")


METADATA_FIELDS = (
    "id",
    "title",
    "description",
    "webpage_url",
    "original_url",
    "channel",
    "channel_id",
    "channel_url",
    "uploader",
    "uploader_id",
    "upload_date",
    "release_date",
    "duration",
    "language",
    "categories",
    "tags",
    "view_count",
    "like_count",
    "availability",
    "thumbnail",
)


def compact_metadata(info: dict[str, Any], language: str, automatic: bool) -> dict[str, Any]:
    metadata = {key: info[key] for key in METADATA_FIELDS if info.get(key) is not None}
    metadata["subtitle_language"] = language
    metadata["subtitle_type"] = "automatic" if automatic else "manual"
    return metadata


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--srt", required=True, type=Path, help="SRT subtitle file from yt-dlp")
    parser.add_argument("--info-json", required=True, type=Path, help="yt-dlp .info.json file")
    parser.add_argument("--output-dir", required=True, type=Path, help="Directory for TXT and compact JSON")
    parser.add_argument("--language", required=True, help="Selected subtitle language tag")
    parser.add_argument("--automatic", action="store_true", help="Selected track is auto-generated")
    args = parser.parse_args()

    if not args.srt.is_file():
        parser.error(f"SRT file not found: {args.srt}")
    if not args.info_json.is_file():
        parser.error(f"info JSON file not found: {args.info_json}")

    info = json.loads(args.info_json.read_text(encoding="utf-8"))
    video_id = str(info.get("id") or args.srt.stem.split(".")[0])
    args.output_dir.mkdir(parents=True, exist_ok=True)

    text = build_plain_text(parse_srt(args.srt))
    if not text.strip():
        parser.error("No subtitle text found in the SRT file")

    txt_path = args.output_dir / f"{video_id}.txt"
    json_path = args.output_dir / f"{video_id}.json"
    txt_path.write_text(text, encoding="utf-8")
    json_path.write_text(
        json.dumps(compact_metadata(info, args.language, args.automatic), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"TXT: {txt_path}")
    print(f"JSON: {json_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
