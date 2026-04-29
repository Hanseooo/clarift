import os

os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("CLERK_SECRET_KEY", "test")
os.environ.setdefault("CLERK_PUBLISHABLE_KEY", "test")
os.environ.setdefault("GOOGLE_API_KEY", "test")
os.environ.setdefault("R2_ACCOUNT_ID", "test")
os.environ.setdefault("R2_ACCESS_KEY_ID", "test")
os.environ.setdefault("R2_SECRET_ACCESS_KEY", "test")
os.environ.setdefault("R2_BUCKET_NAME", "test")
os.environ.setdefault("PAYMONGO_SECRET_KEY", "test")
os.environ.setdefault("PAYMONGO_WEBHOOK_SECRET", "test")

from src.core.config import settings


def test_chat_prompt_allows_latex():
    assert "LaTeX" in settings.CHAT_SYSTEM_PROMPT or "latex" in settings.CHAT_SYSTEM_PROMPT


def test_chat_prompt_allows_code_blocks():
    assert "code blocks" in settings.CHAT_SYSTEM_PROMPT


def test_chat_prompt_allows_tables():
    assert "tables" in settings.CHAT_SYSTEM_PROMPT
