import pytest
from src.core.config import settings

CHAT_SYSTEM_PROMPT = settings.CHAT_SYSTEM_PROMPT


def test_chat_prompt_allows_latex():
    assert "LaTeX" in CHAT_SYSTEM_PROMPT or "latex" in CHAT_SYSTEM_PROMPT


def test_chat_prompt_allows_code_blocks():
    assert "code blocks" in CHAT_SYSTEM_PROMPT


def test_chat_prompt_allows_tables():
    assert "tables" in CHAT_SYSTEM_PROMPT
