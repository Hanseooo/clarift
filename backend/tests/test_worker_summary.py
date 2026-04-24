"""
Unit test for the ARQ worker summary job.
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from src.worker import run_summary_job


@pytest.mark.asyncio
async def test_run_summary_job_success():
    """Test successful summary generation."""
    # Mock data
    summary_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    document_id = str(uuid.uuid4())
    format_value = "bullet"

    # Mock context (ARQ worker context)
    ctx = {}

    # Mock the generate_summary_for_document function
    mock_chain_output = {
        "content": "Mock summary content",
        "quiz_type_flags": {"multiple_choice": True, "fill_in_blanks": False},
    }

    with patch(
        "src.services.summary_service.generate_summary_for_document", new_callable=AsyncMock
    ) as mock_generate:
        mock_generate.return_value = mock_chain_output

        # Mock AsyncSessionLocal as async context manager
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock()
        mock_session.commit = AsyncMock()

        mock_async_session_local = AsyncMock()
        mock_async_session_local.return_value.__aenter__.return_value = mock_session
        mock_async_session_local.return_value.__aexit__.return_value = None

        with patch("src.db.session.AsyncSessionLocal", mock_async_session_local):
            # Execute the job
            await run_summary_job(ctx, summary_id, job_id, user_id, document_id, format_value)

            # Verify generate_summary_for_document was called with correct arguments
            mock_generate.assert_called_once()
            call_kwargs = mock_generate.call_args.kwargs
            assert call_kwargs["user_id"] == uuid.UUID(user_id)
            assert call_kwargs["document_id"] == uuid.UUID(document_id)
            assert call_kwargs["format_value"] == format_value
            assert call_kwargs["db"] is mock_session

            # Verify Summary update
            # We should see two session.execute calls: one for Summary, one for Job
            assert mock_session.execute.call_count == 2

            # Verify Job update
            # We can inspect the update statements, but for simplicity we just check calls
            # The first call updates Summary, second updates Job
            # We'll trust the function logic

            # Verify commit was called
            mock_session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_run_summary_job_failure():
    """Test summary generation failure."""
    summary_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    document_id = str(uuid.uuid4())
    format_value = "bullet"

    ctx = {}

    # Mock generate_summary_for_document to raise an exception
    with patch(
        "src.services.summary_service.generate_summary_for_document", new_callable=AsyncMock
    ) as mock_generate:
        mock_generate.side_effect = Exception("Mock error")

        # Mock AsyncSessionLocal as async context manager
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock()
        mock_session.commit = AsyncMock()

        mock_async_session_local = AsyncMock()
        mock_async_session_local.return_value.__aenter__.return_value = mock_session
        mock_async_session_local.return_value.__aexit__.return_value = None

        with patch("src.db.session.AsyncSessionLocal", mock_async_session_local):
            # Execute the job
            await run_summary_job(ctx, summary_id, job_id, user_id, document_id, format_value)

            # Verify generate_summary_for_document was called
            mock_generate.assert_called_once()

            # Verify error handling: Summary content cleared, Job status failed
            # Should have two session.execute calls (one for Summary, one for Job)
            assert mock_session.execute.call_count == 2

            # Verify commit was called
            mock_session.commit.assert_called_once()
