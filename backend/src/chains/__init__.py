"""AI chains package for Clarift backend."""

from src.chains.content_analysis_chain import run_content_analysis_chain
from src.chains.practice_chain import PracticeChainInput, PracticeChainOutput, run_practice_chain
from src.chains.quiz_chain import QuizChainInput, QuizChainOutput, run_quiz_chain
from src.chains.summary_chain import SummaryChainInput, SummaryChainOutput, run_summary_chain

__all__ = [
    "PracticeChainInput",
    "PracticeChainOutput",
    "QuizChainInput",
    "QuizChainOutput",
    "SummaryChainInput",
    "SummaryChainOutput",
    "is_retryable_error",
    "run_content_analysis_chain",
    "run_practice_chain",
    "run_quiz_chain",
    "run_summary_chain",
]


def is_retryable_error(exc: Exception) -> bool:
    """Return True if the error is retryable (not quota/rate limit)."""
    error_msg = str(exc).lower()
    if "quota" in error_msg or "resource_exhausted" in error_msg or "rate limit" in error_msg:
        return False
    return True
