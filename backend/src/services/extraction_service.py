"""Text extraction from various document formats."""

import io
from typing import Callable

import fitz  # PyMuPDF
from markitdown import MarkItDown


# Registry of extractors by MIME type
_EXTRACTORS: dict[str, Callable[[bytes], str]] = {}


def _register(mime_type: str):
    def decorator(fn: Callable[[bytes], str]) -> Callable[[bytes], str]:
        _EXTRACTORS[mime_type] = fn
        return fn
    return decorator


@_register("application/pdf")
def _extract_pdf(file_bytes: bytes) -> str:
    text_parts = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text())
    return "\n".join(text_parts)


@_register("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
def _extract_docx(file_bytes: bytes) -> str:
    md = MarkItDown()
    result = md.convert_stream(io.BytesIO(file_bytes))
    return result.text_content


@_register("application/vnd.openxmlformats-officedocument.presentationml.presentation")
def _extract_pptx(file_bytes: bytes) -> str:
    md = MarkItDown()
    result = md.convert_stream(io.BytesIO(file_bytes))
    text = result.text_content
    # Preserve slide boundaries with markers
    lines = text.splitlines()
    slide_lines = []
    current_slide = 1
    for line in lines:
        if line.strip() == "---":
            current_slide += 1
            slide_lines.append(f"\n--- Slide {current_slide} ---\n")
        else:
            slide_lines.append(line)
    # Prepend Slide 1 marker if not already present
    if slide_lines and not slide_lines[0].startswith("--- Slide"):
        slide_lines.insert(0, "--- Slide 1 ---\n")
    return "\n".join(slide_lines)


@_register("text/plain")
@_register("text/markdown")
def _extract_text(file_bytes: bytes) -> str:
    for encoding in ("utf-8", "latin-1"):
        try:
            return file_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("Could not decode text file with utf-8 or latin-1")


def extract_text(file_bytes: bytes, mime_type: str) -> str:
    """Extract plain text from a document given its bytes and MIME type."""
    extractor = _EXTRACTORS.get(mime_type)
    if extractor is None:
        raise ValueError(f"Unsupported MIME type: {mime_type}")
    text = extractor(file_bytes)
    if not text or not text.strip():
        raise ValueError("No text could be extracted from the file")
    return text.strip()
