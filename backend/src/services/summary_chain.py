"""
Summary chain (5‑step) for generating structured summaries and diagrams.

Steps:
1. Extract key concepts
2. Identify relationships
3. Generate structured summary
4. Generate diagram syntax (Mermaid/Graphviz)
5. Flag quiz‑worthy sections
"""

import logging
import uuid
from typing import Optional, TypedDict

from langchain_google_genai import ChatGoogleGenerativeAI

from src.core.config import settings

logger = logging.getLogger(__name__)


class SummaryChainInput(TypedDict):
    """Input for the summary chain."""

    document_id: str
    user_id: str
    format: str  # "bullet", "outline", "paragraph"


class SummaryChainOutput(TypedDict):
    """Output from the summary chain."""

    summary_id: str
    content: str
    diagram_syntax: Optional[str]
    diagram_type: Optional[str]
    quiz_type_flags: dict


async def run_summary_chain(input: SummaryChainInput) -> SummaryChainOutput:
    """
    Execute the 5‑step summary chain.

    This implementation uses Gemini via LangChain to generate a structured summary.
    """
    logger.info(
        "Running summary chain for document %s (user %s)",
        input["document_id"],
        input["user_id"],
    )

    # Initialize Gemini LLM
    llm = ChatGoogleGenerativeAI(
        model="gemini-pro",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.2,
    )

    # In a real implementation, we would retrieve document chunks here.
    # For now, we use placeholder text to demonstrate LLM integration.
    placeholder_text = (
        "This is a placeholder for document content. "
        "In production, this would be the extracted text from the uploaded file."
    )

    # Step 1-3: Generate structured summary
    summary_prompt = f"""You are a study assistant. Create a structured summary of the following text.

Text: {placeholder_text}

Please provide:
1. Key concepts (bullet points)
2. Relationships between concepts
3. A concise paragraph summary

Format the output as JSON with keys: key_concepts, relationships, paragraph_summary."""

    try:
        summary_response = await llm.ainvoke(summary_prompt)
        summary_content = summary_response.content
    except Exception as exc:
        logger.error("Gemini API call failed: %s", exc)
        # Fallback to placeholder content
        summary_content = "Summary generation failed due to LLM error."

    # Step 4: Generate diagram syntax (simplified)
    diagram_prompt = """Based on the key concepts and relationships from the text above, generate a Mermaid.js diagram syntax.

Focus on the main entities and their connections.

Return only the Mermaid syntax, no extra text."""

    try:
        diagram_response = await llm.ainvoke(diagram_prompt)
        diagram_syntax = diagram_response.content.strip()
        diagram_type = "mermaid"
    except Exception as exc:
        logger.error("Gemini diagram generation failed: %s", exc)
        diagram_syntax = None
        diagram_type = None

    # Step 5: Flag quiz‑worthy sections (simplified)
    quiz_flags = {"multiple_choice": True, "fill_in_blanks": False}

    # Generate a unique summary ID
    summary_id = str(uuid.uuid4())

    return {
        "summary_id": summary_id,
        "content": summary_content,
        "diagram_syntax": diagram_syntax,
        "diagram_type": diagram_type,
        "quiz_type_flags": quiz_flags,
    }
