"""Service orchestrator for summary generation workflow."""

from __future__ import annotations

import asyncio
import logging
import math
import uuid
from typing import cast

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import retry, stop_after_attempt, wait_exponential

from src.chains.summary_chain import SummaryChainInput, SummaryChainOutput, run_summary_chain
from src.db.models import DocumentChunk, User

logger = logging.getLogger(__name__)


def _dot_product(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b, strict=True))


def _mmr_select(
    candidates: list[tuple[str, list[float]]],
    query_embedding: list[float],
    k: int,
    lambda_param: float = 0.5,
) -> list[str]:
    """Select k diverse chunks using Maximum Marginal Relevance."""
    if not candidates:
        return []

    k = min(k, len(candidates))
    query_sims = [_dot_product(emb, query_embedding) for _, emb in candidates]

    selected_indices: list[int] = []
    candidate_indices = list(range(len(candidates)))

    for _ in range(k):
        best_score = float("-inf")
        best_idx = -1

        for ci in candidate_indices:
            score = lambda_param * query_sims[ci]
            if selected_indices:
                max_sim = max(
                    _dot_product(candidates[ci][1], candidates[si][1]) for si in selected_indices
                )
                score -= (1 - lambda_param) * max_sim

            if score > best_score:
                best_score = score
                best_idx = ci

        selected_indices.append(best_idx)
        candidate_indices.remove(best_idx)

    return [candidates[i][0] for i in selected_indices]


OUTPUT_FORMAT_OPTIONS = {
    "bullet_points",
    "paragraphs",
    "q_and_a",
    "examples",
    "tables",
    "step_by_step",
    "numbered_list",
    "analogies",
    "mnemonics",
}

OUTPUT_FORMAT_HINTS = {
    "bullet_points": "Use bullet points for key concepts.",
    "numbered_list": "Use a numbered list for sequential steps.",
    "paragraphs": "Use concise paragraphs with clear topic sentences.",
    "tables": "Use markdown tables for comparisons or structured data.",
    "step_by_step": "Break complex processes into numbered steps.",
    "q_and_a": 'Use a Q&A format: prefix questions with "> **Q:**" and answers with "> **A:**" or numbered pairs.',
    "examples": "Include a dedicated '## Examples' section with concrete cases from the source material.",
    "analogies": "Include helpful analogies where they clarify difficult concepts.",
    "mnemonics": "Include memory aids or mnemonics where appropriate.",
}


def _build_format_hints(formats: list[str]) -> str:
    hints = [OUTPUT_FORMAT_HINTS[f] for f in formats if f in OUTPUT_FORMAT_HINTS]
    return "\n".join(hints)


EXPLANATION_STYLE_OPTIONS = {
    "simple_direct",
    "detailed_academic",
    "analogy_based",
    "socratic",
    "eli5",
    "mental_models",
}


def _validate_preferences(prefs: dict | None) -> dict:
    """Filter invalid preference values."""
    if not prefs:
        return {}
    result = {}
    if "output_formats" in prefs:
        result["output_formats"] = [
            v for v in prefs["output_formats"] if v in OUTPUT_FORMAT_OPTIONS
        ]
    if "explanation_styles" in prefs:
        result["explanation_styles"] = [
            v for v in prefs["explanation_styles"] if v in EXPLANATION_STYLE_OPTIONS
        ]
    if "custom_instructions" in prefs:
        result["custom_instructions"] = prefs["custom_instructions"]
    return result


async def generate_summary_for_document(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    document_id: uuid.UUID,
    override_preferences: dict | None = None,
) -> SummaryChainOutput:
    """Fetch diverse chunk context and generate summary content with the LLM chain."""
    logger.info(
        f"Starting generate_summary_for_document for user {user_id}, document {document_id}"
    )

    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        task_type="retrieval_document",
        output_dimensionality=768,
    )
    retrieval_query = (
        "Generate a complete study summary highlighting key concepts, "
        "relationships, and useful notes."
    )

    @retry(
        wait=wait_exponential(multiplier=2, min=4, max=30), stop=stop_after_attempt(5), reraise=True
    )
    async def embed_with_retry(query):
        result = await embeddings.aembed_query(query)
        return result

    query_embedding = await embed_with_retry(retrieval_query)

    # Throttle between embedding and LLM calls to avoid rate limits
    await asyncio.sleep(1)

    # Count total chunks to adaptively scale retrieval
    count_result = await db.execute(
        select(func.count(DocumentChunk.id)).where(
            DocumentChunk.user_id == user_id,
            DocumentChunk.document_id == document_id,
            DocumentChunk.embedding.is_not(None),
        )
    )
    total_with_embeddings = count_result.scalar_one() or 0

    # Adaptive chunk count: more content = more chunks, capped at 10
    k = min(10, max(5, math.ceil(total_with_embeddings * 0.15)))

    logger.info(
        "Total %d chunks with embeddings, adaptive k=%d for user %s",
        total_with_embeddings,
        k,
        user_id,
    )

    # Fetch k*3 candidates for MMR diversity selection
    candidates_result = await db.execute(
        select(DocumentChunk.content, DocumentChunk.embedding)
        .where(
            DocumentChunk.user_id == user_id,
            DocumentChunk.document_id == document_id,
            DocumentChunk.embedding.is_not(None),
        )
        .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))
        .limit(k * 3)
    )
    raw_candidates = [
        (row[0], row[1].tolist() if hasattr(row[1], "tolist") else row[1])
        for row in candidates_result.all()
        if row[0] is not None and row[1] is not None
    ]

    chunks: list[str] = []
    if raw_candidates:
        chunks = _mmr_select(raw_candidates, query_embedding, k)
        logger.info(
            f"MMR selected {len(chunks)} diverse chunks from {len(raw_candidates)} candidates"
        )

    if not chunks:
        logger.info("No chunks with embeddings found, trying fallback query")
        fallback_result = await db.execute(
            select(DocumentChunk.content)
            .where(
                DocumentChunk.user_id == user_id,
                DocumentChunk.document_id == document_id,
            )
            .order_by(DocumentChunk.chunk_index.asc())
            .limit(5)
        )
        chunks = [row[0] for row in fallback_result.all() if row[0]]
        logger.info(f"Found {len(chunks)} chunks via fallback")

    if override_preferences:
        preferences_to_use: dict | None = override_preferences
        logger.info(f"Using override preferences for user {user_id}")
    else:
        user_result = await db.execute(select(User.user_preferences).where(User.id == user_id))
        preferences_to_use = cast(dict | None, user_result.scalar_one_or_none())
        logger.info(f"Using database preferences for user {user_id}")

    validated_prefs = _validate_preferences(preferences_to_use)
    output_formats = validated_prefs.get("output_formats", [])
    format_hints = _build_format_hints(output_formats) if output_formats else None
    chain_input = SummaryChainInput(
        chunks=chunks,
        user_preferences=validated_prefs,
        format_hints=format_hints,
    )
    logger.info(f"Calling run_summary_chain with {len(chunks)} chunks")
    result = await run_summary_chain(chain_input)
    return result
