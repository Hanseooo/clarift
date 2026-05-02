from __future__ import annotations

import os
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
import pytest

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

from main import app
from src.api.deps import get_current_user
from src.db.session import get_db


@pytest.mark.asyncio
async def test_chat_accepts_multiple_document_ids() -> None:
    mock_user = SimpleNamespace(
        id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        clerk_user_id="test_clerk",
        email="test@example.com",
        tier="free",
    )
    mock_db = AsyncMock()

    async def override_get_current_user():
        return mock_user

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db

    from src.api.routers import chat as chat_module
    from src.services import chat_service as chat_service_module

    original_enforce_quota = chat_module.enforce_quota

    def noop_enforce_quota(feature):
        return lambda: None

    chat_module.enforce_quota = noop_enforce_quota

    payload = {
        "question": "What is this?",
        "document_ids": [
            "11111111-1111-1111-1111-111111111111",
            "22222222-2222-2222-2222-222222222222",
        ],
        "messages": [],
    }

    with patch("src.api.deps.check_and_increment_quota", new=AsyncMock()):
        with patch.object(
            chat_service_module, "get_relevant_chunks", new=AsyncMock(return_value=[])
        ) as mock_chunks:
            with patch.object(
                chat_service_module,
                "fetch_chat_preferences",
                new=AsyncMock(return_value=None),
            ):
                with patch.object(
                    chat_service_module,
                    "run_chat_chain",
                    new=AsyncMock(
                        return_value={
                            "answer": "Test answer",
                            "citations": [],
                            "relevant_chunks": [],
                        }
                    ),
                ):
                    try:
                        async with httpx.AsyncClient(
                            transport=httpx.ASGITransport(app=app), base_url="http://test"
                        ) as client:
                            response = await client.post("/api/v1/chat", json=payload)

                        assert response.status_code in (200, 501)

                        # Verify get_relevant_chunks received the list of document IDs
                        mock_chunks.assert_awaited_once()
                        call_kwargs = mock_chunks.call_args.kwargs
                        assert "document_ids" in call_kwargs
                        assert len(call_kwargs["document_ids"]) == 2
                    finally:
                        app.dependency_overrides.clear()
                        chat_module.enforce_quota = original_enforce_quota
