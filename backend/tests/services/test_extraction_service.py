import pytest
from src.services.extraction_service import extract_text


def test_extract_pdf():
    # Use a minimal valid PDF or mock fitz
    # For now, verify the function exists and routes correctly
    with pytest.raises(ValueError, match="No text could be extracted"):
        extract_text(b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n", "application/pdf")


def test_extract_txt():
    text = extract_text(b"Hello, world!\nThis is a test.", "text/plain")
    assert "Hello, world!" in text


def test_extract_md():
    text = extract_text(b"# Heading\n\nSome **bold** text.", "text/markdown")
    assert "# Heading" in text


def test_extract_docx():
    # Requires a real .docx file or mocking MarkItDown
    # For unit test, mock the dependency
    from unittest.mock import patch, MagicMock
    with patch("src.services.extraction_service.MarkItDown") as MockMD:
        mock_instance = MagicMock()
        mock_instance.convert_stream.return_value = MagicMock(text_content="Hello from DOCX")
        MockMD.return_value = mock_instance

        text = extract_text(b"fake-docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        assert text == "Hello from DOCX"


def test_extract_pptx_preserves_slide_markers():
    from unittest.mock import patch, MagicMock
    with patch("src.services.extraction_service.MarkItDown") as MockMD:
        mock_instance = MagicMock()
        mock_instance.convert_stream.return_value = MagicMock(
            text_content="Slide 1 content\n---\nSlide 2 content"
        )
        MockMD.return_value = mock_instance

        text = extract_text(b"fake-pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
        assert "--- Slide 1 ---" in text
        assert "--- Slide 2 ---" in text


def test_unsupported_mime_type():
    with pytest.raises(ValueError, match="Unsupported MIME type"):
        extract_text(b"data", "image/png")


def test_empty_text_raises():
    with pytest.raises(ValueError, match="No text could be extracted"):
        extract_text(b"   \n   ", "text/plain")
