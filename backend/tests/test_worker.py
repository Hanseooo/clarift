import pytest
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.mark.asyncio
async def test_process_document_transitions_to_processing():
    """Job status should move from pending -> processing -> completed."""
    from src.worker import process_document

    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=None)
    mock_result = MagicMock()
    mock_doc = MagicMock()
    mock_doc.id = "doc-123"
    mock_doc.file_path = "s3://bucket/file.pdf"
    mock_doc.filename = "file.pdf"
    mock_doc.r2_key = "test/file.pdf"
    mock_doc.user_id = "user-123"
    mock_result.scalar_one_or_none.return_value = mock_doc

    execute_calls = []

    async def mock_execute(stmt):
        execute_calls.append(stmt)
        return mock_result

    mock_session.execute = AsyncMock(side_effect=mock_execute)

    with (
        patch("src.services.s3_service.S3Service") as MockS3,
        patch("fitz.open") as mock_fitz,
        patch("langchain_text_splitters.RecursiveCharacterTextSplitter") as MockSplitter,
        patch("src.worker.process_chunks", new_callable=AsyncMock, return_value=[[0.1] * 768]),
        patch("src.db.session.AsyncSessionLocal", return_value=mock_session),
    ):
        mock_s3 = MockS3.return_value
        mock_s3.download_file = AsyncMock(return_value=b"pdf bytes")

        mock_doc_instance = MagicMock()
        mock_doc_instance.get_text.return_value = "some text"
        mock_fitz.return_value.__enter__ = MagicMock(return_value=mock_doc_instance)
        mock_fitz.return_value.__exit__ = MagicMock(return_value=None)

        mock_splitter = MockSplitter.return_value
        mock_splitter.split_text.return_value = ["chunk1"]

        await process_document({}, "doc-123", "12345678-1234-5678-1234-567812345678")

    # Verify processing transition was called
    statuses = []
    for stmt in execute_calls:
        if hasattr(stmt, "_values"):
            for val in stmt._values.values():
                if hasattr(val, "value"):
                    statuses.append(val.value)
    assert "processing" in statuses, (
        f"Job should be updated to 'processing', got statuses: {statuses}"
    )
    assert "completed" in statuses, (
        f"Job should be updated to 'completed', got statuses: {statuses}"
    )


@pytest.mark.asyncio
async def test_run_summary_job_transitions_to_processing():
    """Summary job should also move to processing before work begins."""
    from src.worker import run_summary_job

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_summary = MagicMock()
    mock_summary.id = "sum-123"
    mock_summary.document_id = "doc-123"
    mock_result.scalar_one_or_none.return_value = mock_summary
    mock_session.execute.return_value = mock_result

    mock_async_session_local = MagicMock()
    mock_async_session_local.return_value.__aenter__ = AsyncMock(return_value=mock_session)
    mock_async_session_local.return_value.__aexit__ = AsyncMock(return_value=None)

    with (
        patch("src.db.session.AsyncSessionLocal", mock_async_session_local),
        patch(
            "src.services.summary_service.generate_summary_for_document",
            new_callable=AsyncMock,
            return_value={"content": "# Summary", "title": "Summary"},
        ),
    ):
        await run_summary_job(
            {},
            "12345678-1234-5678-1234-567812345678",
            "12345678-1234-5678-1234-567812345679",
            "12345678-1234-5678-1234-56781234567a",
            "12345678-1234-5678-1234-56781234567b",
        )

    statuses = []
    for call in mock_session.execute.call_args_list:
        if call.args:
            stmt = call.args[0]
            if hasattr(stmt, "_values"):
                for val in stmt._values.values():
                    if hasattr(val, "value"):
                        statuses.append(val.value)
    assert "processing" in statuses, (
        f"Job should be updated to 'processing', got statuses: {statuses}"
    )


@pytest.mark.asyncio
async def test_process_document_sets_document_ready():
    """Document status must be 'ready' to match frontend contract."""
    from src.worker import process_document

    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=None)
    mock_result = MagicMock()
    mock_doc = MagicMock()
    mock_doc.id = "doc-123"
    mock_doc.file_path = "s3://bucket/file.pdf"
    mock_doc.filename = "file.pdf"
    mock_doc.r2_key = "test/file.pdf"
    mock_doc.user_id = "user-123"
    mock_result.scalar_one_or_none.return_value = mock_doc
    mock_session.execute.return_value = mock_result

    with (
        patch("src.services.s3_service.S3Service") as MockS3,
        patch("fitz.open") as mock_fitz,
        patch("langchain_text_splitters.RecursiveCharacterTextSplitter") as MockSplitter,
        patch("src.worker.process_chunks", new_callable=AsyncMock, return_value=[[0.1] * 768]),
        patch("src.db.session.AsyncSessionLocal", return_value=mock_session),
    ):
        mock_s3 = MockS3.return_value
        mock_s3.download_file = AsyncMock(return_value=b"pdf bytes")

        mock_doc_instance = MagicMock()
        mock_doc_instance.get_text.return_value = "text"
        mock_fitz.return_value.__enter__ = MagicMock(return_value=mock_doc_instance)
        mock_fitz.return_value.__exit__ = MagicMock(return_value=None)

        mock_splitter = MockSplitter.return_value
        mock_splitter.split_text.return_value = ["c"]

        await process_document({}, "doc-123", "12345678-1234-5678-1234-567812345678")

    statuses = []
    for call in mock_session.execute.call_args_list:
        if call.args:
            stmt = call.args[0]
            if hasattr(stmt, "_values"):
                for val in stmt._values.values():
                    if hasattr(val, "value"):
                        statuses.append(val.value)
    assert "ready" in statuses, f"Document status must be 'ready', got statuses: {statuses}"
