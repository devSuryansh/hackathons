"""Featherless.ai OpenAI-compatible chat completions."""

from __future__ import annotations

import os

from openai import OpenAI


class FeatherlessLLM:
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str = "https://api.featherless.ai/v1",
    ) -> None:
        self.api_key = api_key or os.environ.get("FEATHERLESS_API_KEY", "")
        self.model = model or os.environ.get(
            "FEATHERLESS_MODEL", "Qwen/Qwen2.5-7B-Instruct"
        )
        self.base_url = base_url
        self._client: OpenAI | None = None

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    def _get_client(self) -> OpenAI:
        if not self.api_key:
            raise RuntimeError(
                "FEATHERLESS_API_KEY is missing. Add it to .env (see GUIDE.md)."
            )
        if self._client is None:
            self._client = OpenAI(base_url=self.base_url, api_key=self.api_key)
        return self._client

    def complete(
        self,
        system_prompt: str,
        user_text: str,
        history: list[dict[str, str]] | None = None,
    ) -> str:
        messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
        if history:
            for turn in history:
                role = turn.get("role", "user")
                if role not in ("user", "assistant", "system"):
                    role = "user"
                messages.append({"role": role, "content": turn["content"]})
        messages.append({"role": "user", "content": user_text})

        resp = self._get_client().chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=400,
        )
        content = resp.choices[0].message.content or ""
        return content.strip()
