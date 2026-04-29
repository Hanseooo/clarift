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
