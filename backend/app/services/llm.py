"""Optional live LLM helper.

When OPENAI_API_KEY is configured, text generation (complaint drafts, summary
polish) goes through an OpenAI-compatible chat completions endpoint. Any
failure returns None and callers fall back to deterministic templates — the
product must never break because the model did.
"""
from __future__ import annotations

import logging

import httpx

from app import config

log = logging.getLogger("civicos.llm")

_TIMEOUT = httpx.Timeout(10.0)


def available() -> bool:
    return bool(config.OPENAI_API_KEY)


def chat(messages: list[dict], max_tokens: int = 700) -> str | None:
    if not available():
        return None
    try:
        resp = httpx.post(
            f"{config.OPENAI_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {config.OPENAI_API_KEY}"},
            json={
                "model": config.OPENAI_TEXT_MODEL,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.3,
            },
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception as exc:  # noqa: BLE001 — degrade gracefully, always
        log.warning("LLM call failed, falling back to template: %s", exc)
        return None
