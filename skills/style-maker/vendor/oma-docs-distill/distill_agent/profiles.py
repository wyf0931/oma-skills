import json
from pathlib import Path
from typing import Any


def list_profiles() -> list[str]:
    return sorted(path.stem for path in (Path(__file__).parent / "profiles").glob("*.json"))


def load_profile(name: str) -> dict[str, Any]:
    path = Path(__file__).parent / "profiles" / f"{name}.json"
    if not path.exists():
        raise ValueError(f"未知 profile: {name}，可用 profile: {', '.join(list_profiles())}")
    return json.loads(path.read_text(encoding="utf-8"))
