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

import pytest
from sqlalchemy import inspect

from src.db.session import engine


@pytest.mark.asyncio
async def test_user_topic_performance_has_quiz_count():
    """Fresh migration must include quiz_count column."""
    async with engine.begin() as conn:
        result = await conn.run_sync(
            lambda sync_conn: inspect(sync_conn).get_columns("user_topic_performance")
        )
    column_names = {c["name"] for c in result}
    assert "quiz_count" in column_names, "quiz_count column missing in user_topic_performance"
