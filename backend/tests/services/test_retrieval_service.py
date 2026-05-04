from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_embed_query_uses_retrieval_query_task_type():
    """Query embeddings must use task_type='retrieval_query' not 'retrieval_document'."""
    from src.services.retrieval_service import _embed_query

    with patch("src.services.retrieval_service.GoogleGenerativeAIEmbeddings") as mock_embeddings:
        mock_instance = MagicMock()
        mock_instance.aembed_query = AsyncMock(return_value=[0.1] * 768)
        mock_embeddings.return_value = mock_instance

        result = await _embed_query("explain the types of")

        mock_embeddings.assert_called_once_with(
            model="models/gemini-embedding-001",
            task_type="retrieval_query",
            output_dimensionality=768,
        )
        assert len(result) == 768
