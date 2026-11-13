"""The one interface to a language model. Swapping hosted for local is a config change."""
from functools import lru_cache
from typing import Protocol

import httpx

from app.core.config import get_settings


class LLMError(Exception):
    pass


class LLM(Protocol):
    name: str

    def complete(self, system: str, user: str, image: tuple[str, str] | None = None) -> str:
        """image is (mime_type, base64) when the request carries a photo."""


class MockLLM:
    """No model at all. Returns a fixed, clearly labelled answer so the pipeline can be tested."""

    name = "mock"

    def complete(self, system: str, user: str, image: tuple[str, str] | None = None) -> str:
        if image:
            return '{"description": "[mock] No model is connected, so the photo was not analysed.", "next_step": "Connect a vision model in the assistant settings."}'
        return ("[mock] No language model is connected. This is a placeholder answer so the rest "
                "of the system can be built and tested. Set LLM_PROVIDER to use a real model.")


class OpenAICompatibleLLM:
    """Works with any endpoint that speaks the OpenAI chat completions format."""

    def __init__(self) -> None:
        self._settings = get_settings()
        self.name = self._settings.llm_model

    def complete(self, system: str, user: str, image: tuple[str, str] | None = None) -> str:
        content: str | list = user
        if image:
            mime_type, data = image
            content = [{"type": "text", "text": user},
                       {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{data}"}}]
        headers = {"Authorization": f"Bearer {self._settings.llm_api_key}"} if self._settings.llm_api_key else {}
        payload = {"model": self._settings.llm_model, "temperature": 0.2,
                   "messages": [{"role": "system", "content": system}, {"role": "user", "content": content}]}
        try:
            response = httpx.post(f"{self._settings.llm_base_url}/chat/completions", json=payload,
                                  headers=headers, timeout=self._settings.llm_timeout_seconds)
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError) as exc:
            raise LLMError(str(exc)) from exc


@lru_cache
def get_llm() -> LLM:
    if get_settings().llm_provider == "openai_compatible":
        return OpenAICompatibleLLM()
    return MockLLM()
