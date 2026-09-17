from dataclasses import dataclass
import os
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    api_key: str
    base_url: str
    model: str
    temperature: float
    fetch_endpoint: str
    reasoning_effort: str = "high"
    max_tokens: int = 24000
    json_reasoning_effort: str = "none"
    provider: str = "openai-compatible"
    thinking_type: str = ""

    @classmethod
    def from_env(cls, env_file: Path | None = None) -> "Settings":
        load_dotenv(env_file or Path(".env"))

        def value(name: str, legacy_name: str | None = None, default: str = "") -> str:
            current = os.getenv(name)
            if current is not None and current.strip():
                return current.strip()
            # Temporary migration fallback for existing local .env files.
            return os.getenv(legacy_name, default).strip() if legacy_name else default

        return cls(
            api_key=value("OPENAI_API_KEY", "SENSENOVA_API_KEY"),
            base_url=value("OPENAI_BASE_URL", "SENSENOVA_BASE_URL", "https://api.openai.com/v1"),
            model=value("OPENAI_MODEL", "SENSENOVA_MODEL", "gpt-4o-mini"),
            temperature=float(os.getenv("DISTILL_TEMPERATURE", "0.2")),
            fetch_endpoint=os.getenv("FETCH_ENDPOINT", "http://127.0.0.1:7890/api/fetch").strip(),
            reasoning_effort=value("OPENAI_REASONING_EFFORT", "SENSENOVA_REASONING_EFFORT", "high").lower(),
            max_tokens=int(value("OPENAI_MAX_TOKENS", "SENSENOVA_MAX_TOKENS", "24000")),
            json_reasoning_effort=value("OPENAI_JSON_REASONING_EFFORT", "SENSENOVA_JSON_REASONING_EFFORT", "none").lower(),
            provider=os.getenv("LLM_PROVIDER", "openai-compatible").strip(),
            thinking_type=os.getenv("OPENAI_THINKING_TYPE", "").strip().lower(),
        )
