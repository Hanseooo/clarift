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
    GEMINI_API_KEY: str

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
        "You are a study assistant. Answer ONLY using the provided context from the student's "
        "uploaded notes. Never use knowledge outside the context. Always cite the source. "
        "If the context does not contain the answer, use the fallback message exactly."
    )
    CHAT_WINDOW_SECONDS: int = 18000  # 5 hours

    class Config:
        env_file = ".env"


settings = Settings()
