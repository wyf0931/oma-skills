import json
from typing import Any

from openai import NotFoundError, OpenAI

from .config import Settings


class LLMClient:
    def __init__(self, settings: Settings):
        if not settings.api_key:
            raise RuntimeError("缺少 OPENAI_API_KEY，请复制 .env.example 为 .env 并填写 API key")
        self.settings = settings
        self.client = OpenAI(api_key=settings.api_key, base_url=settings.base_url)

    def ask_json(self, system: str, user: str) -> dict[str, Any]:
        extra_body = {}
        if self.settings.thinking_type:
            extra_body["thinking"] = {"type": self.settings.thinking_type}
        messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
        last_finish_reason = "unknown"
        for attempt in range(2):
            if attempt:
                messages[-1]["content"] = (
                    user + "\n\n请重试：只返回一个完整、合法的 JSON 对象，不要返回空 content、解释文字或 Markdown 代码围栏。"
                )
            try:
                response = self.client.chat.completions.create(
                    model=self.settings.model,
                    messages=messages,
                    temperature=self.settings.temperature,
                    max_tokens=self.settings.max_tokens,
                    stream=False,
                    reasoning_effort=self.settings.json_reasoning_effort,
                    response_format={"type": "json_object"},
                    **({"extra_body": extra_body} if extra_body else {}),
                )
            except NotFoundError as exc:
                raise RuntimeError(
                    f"模型路由不可用: {self.settings.model}。"
                    "请检查 OPENAI_BASE_URL、OPENAI_MODEL 和 LLM_PROVIDER 配置。"
                ) from exc
            message = response.choices[0].message
            contents = [getattr(message, "content", None), getattr(message, "reasoning_content", None)]
            for content in contents:
                if content:
                    parsed = parse_json_object(content)
                    if parsed is not None:
                        return parsed
            last_finish_reason = getattr(response.choices[0], "finish_reason", "unknown")
        raise ValueError(f"模型两次均未返回 JSON 对象（finish_reason={last_finish_reason}，已尝试 content/reasoning_content）")


def parse_json_object(content: str) -> dict[str, Any] | None:
    """Parse a JSON object even when a compatible provider adds a short prefix/suffix."""
    decoder = json.JSONDecoder()
    for index, char in enumerate(content):
        if char != "{":
            continue
        try:
            value, _ = decoder.raw_decode(content[index:])
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value
    return None
