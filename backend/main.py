import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.routers.auth import router as auth_router
from src.api.routers.chat import router as chat_router
from src.api.routers.documents import router as documents_router
from src.api.routers.jobs import router as jobs_router
from src.api.routers.practice import router as practice_router
from src.api.routers.quizzes import router as quizzes_router
from src.api.routers.quota import router as quota_router
from src.api.routers.summaries import router as summaries_router
from src.core.config import settings
from src.core.exceptions import DocumentNotReadyException, QuotaExceededException

if settings.SENTRY_DSN:
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)

app = FastAPI(title="Clarift API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://clarift.me", "https://clarift-ai.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(QuotaExceededException)
async def quota_handler(request: Request, exc: QuotaExceededException):
    return JSONResponse(
        status_code=429,
        content={
            "error": {
                "code": "QUOTA_EXCEEDED",
                "message": f"You've used all {exc.limit} {exc.feature} today. Upgrade to Pro for more.",
                "details": {
                    "feature": exc.feature,
                    "used": exc.used,
                    "limit": exc.limit,
                    "reset_at": exc.reset_at.isoformat() if exc.reset_at else None,
                },
            }
        },
    )


@app.exception_handler(DocumentNotReadyException)
async def doc_not_ready_handler(request: Request, exc: DocumentNotReadyException):
    return JSONResponse(
        status_code=409,
        content={
            "error": {
                "code": "DOCUMENT_NOT_READY",
                "message": "Document is still processing.",
            }
        },
    )


# Routers
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(summaries_router)
app.include_router(quizzes_router)
app.include_router(practice_router)
app.include_router(chat_router)
app.include_router(jobs_router)
app.include_router(quota_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
