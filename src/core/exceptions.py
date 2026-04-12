from fastapi import HTTPException


class QuotaExceededException(Exception):
    def __init__(self, feature: str, used: int, limit: int, reset_at=None):
        self.feature = feature
        self.used = used
        self.limit = limit
        self.reset_at = reset_at


class DocumentNotReadyException(Exception):
    def __init__(self, document_id: str):
        self.document_id = document_id


class GenerationFailedException(Exception):
    def __init__(self, message: str):
        self.message = message


class ChatQuotaExceededException(Exception):
    def __init__(self, reset_in_seconds: int):
        self.reset_in_seconds = reset_in_seconds
