from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_ENV: Literal["development", "production"] = "development"
    SECRET_KEY: str

    # Database
    DATABASE_URL: str  # asyncpg format: postgresql+asyncpg://...

    # Redis
    REDIS_URL: str

    # Auth
    CLERK_SECRET_KEY: str
    CLERK_PUBLISHABLE_KEY: str
    CLERK_JWKS_URL: str | None = None
    CLERK_ISSUER: str | None = None

    # Gemini
    GOOGLE_API_KEY: str

    # R2
    R2_ACCOUNT_ID: str
    R2_ACCESS_KEY_ID: str
    R2_SECRET_ACCESS_KEY: str
    R2_BUCKET_NAME: str

    # PayMongo
    PAYMONGO_SECRET_KEY: str
    PAYMONGO_WEBHOOK_SECRET: str

    # Sentry
    SENTRY_DSN: str = ""

    # Feature constants
    CHAT_FALLBACK_MESSAGE: str = (
        "I cannot find this in your uploaded notes. "
        "Try asking about a different topic, or check if you've uploaded the relevant material."
    )
    CHAT_SYSTEM_PROMPT: str = (
        "You are Clarift, a study assistant. Answer ONLY using the provided context from the "
        "student's uploaded notes. Never use knowledge outside the context.\n\n"
        "Rules:\n"
        "1. Source fidelity: Base every explanation strictly on the wording and facts in the "
        "provided context. Rephrase only when necessary for clarity. Do not add, infer, or "
        "embellish any information not present in the context.\n"
        "2. Markdown format: Structure your response in Markdown. Use headings, bullet points, "
        "bold text, and inline code where appropriate for readability.\n"
        "3. Citations: Cite the source for key facts by referencing the relevant part of the notes.\n"
        "4. Exact fallback: If the context does not contain the answer, output ONLY the exact "
        "fallback message. Do not add any introductory text, apology, or explanation."
    )
    CHAT_WINDOW_SECONDS: int = 18000  # 5 hours

    # Document processing safety limits
    MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024
    MAX_DOCUMENT_BYTES: int = 50 * 1024 * 1024
    MAX_PDF_PAGES: int = 300
    MAX_EXTRACTED_CHARS: int = 1_000_000
    MAX_CHUNKS_PER_DOCUMENT: int = 500

    class Config:
        env_file = ".env"


settings = Settings()
