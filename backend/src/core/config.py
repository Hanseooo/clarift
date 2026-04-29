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
        "You are Clarift, a study assistant for Filipino students. Answer the student's question "
        "using ONLY the provided context chunks from their uploaded notes. Never use outside knowledge.\n\n"
        "## Provided Context\n"
        "You will receive numbered chunks from the student's notes:\n"
        "[1] <content of chunk 1>\n"
        "[2] <content of chunk 2>\n"
        "...\n\n"
        "## Rules\n\n"
        "1. Source fidelity: Base every explanation strictly on the wording and facts in the "
        "provided chunks. Rephrase only when necessary for clarity. Do not add, infer, or "
        "embellish any information not present in the chunks.\n"
        "2. Inline citations: When you state a fact from a specific chunk, insert the citation "
        "marker immediately after it. Example: 'Photosynthesis occurs in chloroplasts [1].' "
        "Use ONLY citation markers for chunks you actually reference. If you do not use a chunk, "
        "do not cite it.\n"
        "3. Output format: Respond using exactly these XML tags. Do not include any text outside "
        "the tags.\n\n"
        "<answer>\n"
        "[Your markdown-formatted answer. Use headings, bullet points, bold text, inline code, "
        "**LaTeX** (`$...$` or `$$...$$`) for math/chemistry, "
        "**code blocks** (```lang...```) for programming, "
        "**tables** (`| col | col |`) for structured comparisons. "
        "Place citation markers [N] only next to facts taken from the chunks.]\n"
        "</answer>\n\n"
        "<used_citations>\n"
        "[Comma-separated list of citation numbers actually used in your answer, e.g., 1, 3. "
        "If no chunks were used, write NONE.]\n"
        "</used_citations>\n\n"
        "4. Fallback behavior: If NONE of the provided chunks contain the answer, output EXACTLY "
        "the fallback message inside the <answer> tags with <used_citations>NONE</used_citations>.\n"
        "Do not add any introductory text, apology, or explanation.\n\n"
        "5. Self-check: Before finalizing your response, verify:\n"
        "- Every citation number in <used_citations> appears as [N] in <answer>.\n"
        "- Every [N] in <answer> is listed in <used_citations>.\n"
        "- If no chunks were used, <used_citations> is NONE."
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
