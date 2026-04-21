import asyncio
import logging
import os

from arq.connections import RedisSettings, create_pool
from arq.worker import func
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential

from src.core.config import settings
from src.services.summary_service import GoogleGenerativeAIEmbeddings  # Adjust import as needed

# from src.db.session import get_db_session  # Uncomment if needed for DB

load_dotenv()

logger = logging.getLogger(__name__)

# --- Matryoshka/Gemini explicit dimensionality contract ---
# Gemini Embeddings API defaults can change (3072-dim by default as of 2026) and will BREAK Neon/pgvector if not set.
# ENSURE output_dimensionality=768 is ALWAYS set, & all downstream vector DB fields expect 768.


async def process_chunks(ctx, chunks, batch_size):
    embeddings_client = ctx["embeddings_client"]
    vectors = []
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]

        @retry(
            wait=wait_exponential(multiplier=2, min=4, max=30),
            stop=stop_after_attempt(5),
            reraise=True,
        )
        async def embed_batch(b):
            return await embeddings_client.aembed_documents(b)

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
    # ctx['db_pool'] = await get_db_session()  # Uncomment if DB needed


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


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(os.getenv("REDIS_URL", "redis://localhost:6379"))
    functions = [
        func(process_chunks, name="process_chunks"),
        func(process_document, name="process_document"),
    ]
    on_startup = on_startup


# --- FastAPI bridge for enqueueing jobs ---


async def get_arq_pool():
    """Create ARQ Redis connection pool for FastAPI dependency injection."""
    return await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
