from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_chat_uses_limit_10():
    """Chat retrieval must request 10 chunks, not 5."""
    from src.services.chat_service import run_chat

    mock_db = MagicMock()

    with patch("src.services.chat_service.get_relevant_chunks", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = []

        with patch("src.services.chat_service.fetch_chat_preferences", new_callable=AsyncMock) as mock_prefs:
            mock_prefs.return_value = None

            with patch("src.services.chat_service.run_chat_chain", new_callable=AsyncMock) as mock_chain:
                mock_chain.return_value = {"answer": "test", "citations": []}

                await run_chat(
                    db=mock_db,
                    user_id=MagicMock(),
                    question="test",
                    document_ids=[MagicMock()],
                    messages=None,
                    mode_override=None,
                    persona_override=None,
                )

                mock_get.assert_awaited_once()
                call_kwargs = mock_get.call_args.kwargs
                assert call_kwargs.get("limit") == 10
