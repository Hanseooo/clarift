import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from src.core.config import settings
from src.core.exceptions import QuotaExceededException, DocumentNotReadyException

if settings.SENTRY_DSN:
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)

app = FastAPI(title="Clarift API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://clarift.app"],
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


# TODO: include routers later
# app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
# app.include_router(documents.router, prefix="/api/v1/documents", tags=["documents"])
# app.include_router(summaries.router, prefix="/api/v1/summaries", tags=["summaries"])
# app.include_router(quizzes.router, prefix="/api/v1/quizzes", tags=["quizzes"])
# app.include_router(practice.router, prefix="/api/v1/practice", tags=["practice"])
# app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
# app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["jobs"])


@app.get("/health")
async def health():
    return {"status": "ok"}
