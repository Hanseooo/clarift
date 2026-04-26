from datetime import datetime

from pydantic import BaseModel


class QuotaResponse(BaseModel):
    summaries_used: int
    summaries_limit: int
    quizzes_used: int
    quizzes_limit: int
    practice_used: int
    practice_limit: int
    chat_used: int
    chat_limit: int
    documents_used: int
    documents_limit: int
    reset_at: datetime
    tier: str
