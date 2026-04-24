import asyncio
import logging
import os
import uuid

from arq.connections import RedisSettings, create_pool
from arq.worker import func
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential

from src.core.config import settings
from src.services.summary_service import GoogleGenerativeAIEmbeddings  # Adjust import as needed

load_dotenv()

logger = logging.getLogger(__name__)


async def _update_job_status(db_session, job_id: str, status: str, result=None, error=None):
    """Helper to update job status, reducing duplication across error handlers."""
    from sqlalchemy import update

    from src.db.models import Job

    values = {"status": status}
    if result is not None:
        values["result"] = result
    if error is not None:
        values["error"] = error
    await db_session.execute(update(Job).where(Job.id == uuid.UUID(job_id)).values(values))
    await db_session.commit()


async def process_chunks(ctx, chunks, batch_size):
    embeddings_client = ctx["embeddings_client"]
    vectors = []

    @retry(
        wait=wait_exponential(multiplier=2, min=4, max=30),
        stop=stop_after_attempt(5),
        reraise=True,
    )
    async def embed_batch(b):
        return await embeddings_client.aembed_documents(b)

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]

        try:
            batch_vectors = await embed_batch(batch)
            # --- Fail-fast batch assertion on embedding size for Matryoshka/Gemini (required for prod safety!)
            if not all(len(v) == 768 for v in batch_vectors):
                actual_dims = [len(v) for v in batch_vectors[:5]]
                raise ValueError(
                    f"Dimension mismatch in batch! Expected 768, but found sizes like {actual_dims}. "
                    "Verify 'output_dimensionality' is set to 768 in the embedding client."
                )
            vectors.extend(batch_vectors)
            await asyncio.sleep(2)  # Throttle between batches
        except Exception as e:
            logger.error("Failed to embed batch after retries: %s", e)
            raise
    return vectors


async def on_startup(ctx):
    ctx["embeddings_client"] = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        output_dimensionality=768,
    )
    logger.info("ARQ Worker startup: Embeddings client (explicit 768-dim Matryoshka) initialized.")


async def process_document(ctx, document_id: str, job_id: str):
    """
    Process document: Download from R2, extract text, chunk, embed, and save to DB.
    """
    import fitz
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from sqlalchemy import update
    from sqlalchemy.future import select

    from src.db.models import Document, DocumentChunk, Job
    from src.db.session import AsyncSessionLocal
    from src.services.s3_service import S3Service

    logger.info(f"Starting process_document for doc {document_id} and job {job_id}")

    try:
        async with AsyncSessionLocal() as session:
            # 1. Fetch document metadata
            result = await session.execute(select(Document).where(Document.id == document_id))
            document = result.scalar_one_or_none()
            if not document:
                raise ValueError(f"Document {document_id} not found")

            # 2. Download from R2
            logger.info(f"Downloading from R2: {document.r2_key}")
            s3_service = S3Service()
            pdf_bytes = await s3_service.download_file(document.r2_key)

            # 3. Extract text
            logger.info("Extracting text from PDF...")
            with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
                text = "\n".join(page.get_text() for page in doc)

            # 4. Chunk text
            logger.info("Chunking text...")
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
            )
            chunks = text_splitter.split_text(text)
            logger.info(f"Created {len(chunks)} chunks")

            # 5. Embed chunks
            logger.info("Generating embeddings...")
            vectors = await process_chunks(ctx, chunks, batch_size=20)

            # 6. Save chunks to DB
            logger.info("Saving chunks and embeddings to database...")
            for i, (chunk_text, embedding) in enumerate(zip(chunks, vectors, strict=False)):
                doc_chunk = DocumentChunk(
                    document_id=document.id,
                    user_id=document.user_id,
                    chunk_index=i,
                    content=chunk_text,
                    embedding=embedding,
                )
                session.add(doc_chunk)

            # 7. Update Document status
            await session.execute(
                update(Document).where(Document.id == document_id).values(status="completed")
            )

            # 8. Update Job status
            await session.execute(
                update(Job)
                .where(Job.id == job_id)
                .values(
                    status="completed",
                    result={"message": "Document processed successfully", "chunks": len(chunks)},
                )
            )

            await session.commit()
            logger.info(f"Finished process_document for doc {document_id}")

    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}", exc_info=True)
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(Document)
                .where(Document.id == document_id)
                .values(status="failed", error=str(e))
            )
            await session.execute(
                update(Job).where(Job.id == job_id).values(status="failed", error=str(e))
            )
            await session.commit()


async def run_summary_job(
    ctx,
    summary_id: str,
    job_id: str,
    user_id: str,
    document_id: str,
    format_value: str,
    override_preferences: dict | None = None,
):
    """
    Generate summary for a document: retrieve chunks, run summary chain, save results.
    """
    from langchain_google_genai.chat_models import ChatGoogleGenerativeAIError
    from sqlalchemy import update

    from src.db.models import Job, Summary
    from src.db.session import AsyncSessionLocal
    from src.services.summary_service import generate_summary_for_document

    logger = logging.getLogger(__name__)
    logger.info(f"Starting run_summary_job for summary {summary_id}, job {job_id}")

    try:
        async with AsyncSessionLocal() as session:
            logger.info(f"Database session created for summary {summary_id}")
            # Generate summary using service with timeout
            logger.info(f"Calling generate_summary_for_document for document {document_id}")
            try:
                # Add timeout to prevent hanging (5 minutes)
                chain_output = await asyncio.wait_for(
                    generate_summary_for_document(
                        db=session,
                        user_id=uuid.UUID(user_id),
                        document_id=uuid.UUID(document_id),
                        format_value=format_value,
                        override_preferences=override_preferences,
                    ),
                    timeout=300.0,  # 5 minutes
                )
                logger.info(f"Successfully generated summary chain output for {summary_id}")
            except asyncio.TimeoutError:
                error_msg = (
                    f"Summary generation timed out after 5 minutes for document {document_id}"
                )
                logger.error(error_msg)
                raise TimeoutError(error_msg)

            # Update Summary record
            await session.execute(
                update(Summary)
                .where(Summary.id == uuid.UUID(summary_id))
                .values(
                    content=chain_output["content"],
                    quiz_type_flags=chain_output["quiz_type_flags"],
                )
            )

            # Update Job status
            await session.execute(
                update(Job)
                .where(Job.id == uuid.UUID(job_id))
                .values(
                    status="completed",
                    result={"message": "Summary generated successfully", "summary_id": summary_id},
                )
            )

            await session.commit()
            logger.info(f"Finished run_summary_job for summary {summary_id}")

    except ChatGoogleGenerativeAIError as e:
        # Handle AI service errors (quota, rate limits, etc.)
        error_msg = str(e)
        if "quota" in error_msg.lower() or "RESOURCE_EXHAUSTED" in error_msg:
            error_msg = "AI quota exceeded. Please check your Google AI quota or try again later."
        elif "rate limit" in error_msg.lower():
            error_msg = "AI rate limit exceeded. Please try again later."

        logger.error(f"AI error generating summary {summary_id}: {error_msg}", exc_info=True)
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(Summary)
                .where(Summary.id == uuid.UUID(summary_id))
                .values(content="", quiz_type_flags=None)
            )
            await session.execute(
                update(Job)
                .where(Job.id == uuid.UUID(job_id))
                .values(status="failed", error=error_msg)
            )
            await session.commit()

    except TimeoutError as e:
        logger.error(f"Timeout generating summary {summary_id}: {str(e)}", exc_info=True)
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(Summary)
                .where(Summary.id == uuid.UUID(summary_id))
                .values(content="", quiz_type_flags=None)
            )
            await session.execute(
                update(Job).where(Job.id == uuid.UUID(job_id)).values(status="failed", error=str(e))
            )
            await session.commit()

    except Exception as e:
        logger.error(f"Error generating summary {summary_id}: {str(e)}", exc_info=True)
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(Summary)
                .where(Summary.id == uuid.UUID(summary_id))
                .values(content="", quiz_type_flags=None)
            )
            await session.execute(
                update(Job).where(Job.id == uuid.UUID(job_id)).values(status="failed", error=str(e))
            )
            await session.commit()


@retry(
    wait=wait_exponential(multiplier=2, min=4, max=30),
    stop=stop_after_attempt(5),
    reraise=True,
)
async def _run_quiz_chain(input_data):
    """Retry-wrapped helper for the LLM/chain portion of quiz generation."""
    from src.chains.quiz_chain import run_quiz_chain

    return await run_quiz_chain(input_data)


async def run_quiz_job(
    ctx,
    quiz_id: str,
    job_id: str,
    user_id: str,
    document_id: str,
    question_count: int = 5,
    question_distribution: dict | None = None,
    auto_mode: bool = True,
):
    """
    Generate quiz for a document: retrieve summary content, run quiz chain, save results.
    """
    from langchain_google_genai.chat_models import ChatGoogleGenerativeAIError
    from sqlalchemy import update
    from sqlalchemy.future import select

    from src.chains.quiz_chain import QuizChainInput
    from src.db.models import Job, Quiz, Summary
    from src.db.session import AsyncSessionLocal

    logger = logging.getLogger(__name__)
    logger.info(f"Starting run_quiz_job for quiz {quiz_id}, job {job_id}")

    try:
        async with AsyncSessionLocal() as session:
            # Validate quiz exists before proceeding
            result = await session.execute(select(Quiz).where(Quiz.id == uuid.UUID(quiz_id)))
            quiz = result.scalar_one_or_none()
            if not quiz:
                raise ValueError(f"Quiz {quiz_id} not found")

            # Update job status to processing
            await session.execute(
                update(Job).where(Job.id == uuid.UUID(job_id)).values(status="processing")
            )
            await session.commit()

            # Fetch the summary content for the document
            summary_result = await session.execute(
                select(Summary.content).where(
                    Summary.user_id == uuid.UUID(user_id),
                    Summary.document_id == uuid.UUID(document_id),
                )
            )
            summary_row = summary_result.scalar_one_or_none()
            if not summary_row:
                raise ValueError(f"Summary not found for document {document_id}")
            chunks = [summary_row]

            # Run quiz chain with timeout (5 minutes)
            try:
                chain_output = await asyncio.wait_for(
                    _run_quiz_chain(
                        QuizChainInput(
                            document_id=document_id,
                            user_id=user_id,
                            question_count=question_count,
                            auto_mode=auto_mode,
                            question_distribution=question_distribution or {"mcq": question_count},
                            chunks=chunks,
                        )
                    ),
                    timeout=300.0,
                )
                logger.info(f"Successfully generated quiz chain output for {quiz_id}")
            except asyncio.TimeoutError:
                error_msg = f"Quiz generation timed out after 5 minutes for document {document_id}"
                logger.error(error_msg)
                raise TimeoutError(error_msg)

            # Update Quiz record
            await session.execute(
                update(Quiz)
                .where(Quiz.id == uuid.UUID(quiz_id))
                .values(
                    questions=chain_output["questions"],
                    question_types=chain_output["question_types"],
                    question_count=len(chain_output["questions"]),
                )
            )

            # Update Job status
            await session.execute(
                update(Job)
                .where(Job.id == uuid.UUID(job_id))
                .values(
                    status="completed",
                    result={"message": "Quiz generated successfully", "quiz_id": quiz_id},
                )
            )

            await session.commit()
            logger.info(f"Finished run_quiz_job for quiz {quiz_id}")

    except ChatGoogleGenerativeAIError as e:
        error_msg = str(e)
        if "quota" in error_msg.lower() or "RESOURCE_EXHAUSTED" in error_msg:
            error_msg = "AI quota exceeded. Please check your Google AI quota or try again later."
        elif "rate limit" in error_msg.lower():
            error_msg = "AI rate limit exceeded. Please try again later."

        logger.error(f"AI error generating quiz {quiz_id}: {error_msg}", exc_info=True)
        async with AsyncSessionLocal() as session:
            await _update_job_status(session, job_id, "failed", error=error_msg)

    except TimeoutError as e:
        logger.error(f"Timeout generating quiz {quiz_id}: {str(e)}", exc_info=True)
        async with AsyncSessionLocal() as session:
            await _update_job_status(session, job_id, "failed", error=str(e))

    except Exception as e:
        logger.error(f"Error generating quiz {quiz_id}: {str(e)}", exc_info=True)
        async with AsyncSessionLocal() as session:
            await _update_job_status(session, job_id, "failed", error=str(e))


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(os.getenv("REDIS_URL", "redis://localhost:6379"))
    functions = [
        func(process_chunks, name="process_chunks"),
        func(process_document, name="process_document"),
        func(run_summary_job, name="run_summary_job"),
        func(run_quiz_job, name="run_quiz_job"),
    ]
    on_startup = on_startup


# --- FastAPI bridge for enqueueing jobs ---


async def get_arq_pool():
    """Create ARQ Redis connection pool for FastAPI dependency injection."""
    return await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
