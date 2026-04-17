# 02-Core-Loop-Completion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalize the structured summary loop by replacing backend stubs with real R2 storage (aioboto3), PDF extraction (PyMuPDF), semantic chunking (pgvector), and an asynchronous LangChain generation pipeline via ARQ.

**Architecture:** 
1. Real PDF uploads are stored in Cloudflare R2.
2. Background ARQ tasks handle downloading from R2, text extraction via PyMuPDF, chunking, and embedding via Google GenAI embeddings into a `pgvector` table.
3. The Summaries API dispatches an ARQ job that executes the LangChain chain.
4. The LangChain chain retrieves the top vector chunks (filtered strictly by `user_id` and `document_id`), applies Tenacity retries, and generates the structured summary via `gemini-2.5-flash`.

**Tech Stack:** FastAPI, ARQ, LangChain, Google GenAI, aioboto3, PyMuPDF, pgvector, SQLAlchemy.

---

## Chunk 1: Dependencies and S3 Service

### Task 1: Add Backend Dependencies

**Files:**
- Modify: `backend/pyproject.toml` (or `backend/requirements.txt`)

- [ ] **Step 1: Add libraries**
```toml
# Add to dependencies
"aioboto3>=13.0.0",
"pymupdf>=1.24.0", # or fitz
"pgvector>=0.2.5",
"tenacity>=8.2.0"
```
- [ ] **Step 2: Install dependencies**
Run: `cd backend && uv pip install -r pyproject.toml` (or equivalent based on lockfile)
Expected: Dependencies install successfully.

### Task 2: Create S3/R2 Service

**Files:**
- Create: `backend/src/services/s3_service.py`

- [ ] **Step 1: Write the S3 service implementation**
```python
import aioboto3
from typing import BinaryIO
from backend.src.core.config import settings

class S3Service:
    def __init__(self):
        self.session = aioboto3.Session()
        self.config = {
            "service_name": "s3",
            "endpoint_url": f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            "aws_access_key_id": settings.R2_ACCESS_KEY_ID,
            "aws_secret_access_key": settings.R2_SECRET_ACCESS_KEY,
            "region_name": "auto",
        }
        self.bucket = settings.R2_BUCKET_NAME

    async def upload_file(self, file_obj: BinaryIO, object_name: str) -> str:
        async with self.session.client(**self.config) as client:
            await client.upload_fileobj(file_obj, self.bucket, object_name)
        return object_name

    async def download_file(self, object_name: str) -> bytes:
        async with self.session.client(**self.config) as client:
            response = await client.get_object(Bucket=self.bucket, Key=object_name)
            return await response['Body'].read()
```
- [ ] **Step 2: Commit**
```bash
git add backend/pyproject.toml backend/src/services/s3_service.py
git commit -m "feat(backend): add s3 service and dependencies for R2 integration"
```

## Chunk 2: Database and Upload API

### Task 3: Setup pgvector in SQLAlchemy

**Files:**
- Modify: `backend/src/db/models.py`
- Create: `backend/alembic/versions/xxx_add_pgvector.py`

- [ ] **Step 1: Modify DocumentChunk model**
```python
from pgvector.sqlalchemy import Vector

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    # ... existing columns ...
    embedding: Mapped[list[float] | None] = mapped_column(Vector(768), nullable=True) # 768 for gemini
```
- [ ] **Step 2: Generate and apply migration**
Run: `cd backend && alembic revision --autogenerate -m "Add pgvector to DocumentChunk"`
*Manually edit the generated migration to ensure `op.execute('CREATE EXTENSION IF NOT EXISTS vector')` is at the top of `upgrade()`*.
Run: `cd backend && alembic upgrade head`

### Task 4: Real Document Upload

**Files:**
- Modify: `backend/src/api/routers/documents.py`

- [ ] **Step 1: Replace upload stub with S3Service**
```python
from backend.src.services.s3_service import S3Service
import uuid

@router.post("/upload")
async def upload_document(
    file: UploadFile,
    # ... existing deps ...
):
    s3_service = S3Service()
    object_key = f"{user.id}/{uuid.uuid4()}_{file.filename}"
    
    # Replace stub with real upload
    await s3_service.upload_file(file.file, object_key)
    
    # Save to db with real object_key
    # ...
```
- [ ] **Step 2: Commit**
```bash
git add backend/src/db/models.py backend/alembic/versions/ backend/src/api/routers/documents.py
git commit -m "feat(backend): implement pgvector and real R2 document upload"
```

## Chunk 3: The ARQ Worker Extraction Pipeline

### Task 5: Implement PyMuPDF Extraction & Chunking

**Files:**
- Modify: `backend/src/worker.py`

- [ ] **Step 1: Update `process_document` to use PyMuPDF and Google Embeddings**
```python
import fitz # PyMuPDF
from backend.src.services.s3_service import S3Service
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

async def process_document(ctx, document_id: str, user_id: str):
    # 1. DB setup ...
    # 3. Download from R2
    s3_service = S3Service()
    file_bytes = await s3_service.download_file(document.file_key)
    
    # 4. Extract Text
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    extracted_text = ""
    for page in doc:
        extracted_text += page.get_text()
    
    # 5. Semantic Chunking
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_text(extracted_text)
    
    # 6. Embeddings
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    vectors = await embeddings.aembed_documents(chunks)
    
    # 7. Save to DocumentChunk (filtered by user_id!)
    # Insert chunks and vectors into DB associated with user_id and document_id
```
- [ ] **Step 2: Run tests/linting**
Run: `cd backend && ruff check .`
- [ ] **Step 3: Commit**
```bash
git add backend/src/worker.py
git commit -m "feat(backend): implement real PDF extraction and pgvector embedding"
```

## Chunk 4: The Summary GenAI Pipeline

### Task 6: Dispatch ARQ Job from Summaries API

**Files:**
- Modify: `backend/src/api/routers/summaries.py`

- [ ] **Step 1: Dispatch ARQ instead of direct call**
```python
@router.post("")
async def create_summary(
    request: SummaryRequest,
    # ...
    arq_pool: ArqRedis = Depends(get_arq_pool)
):
    # Replace direct call with arq enqueue
    job = await arq_pool.enqueue_job(
        "run_summary_chain",
        document_id=request.document_id,
        user_id=str(user.id),
        format=request.format
    )
    return {"job_id": job.job_id}
```

### Task 7: Finalize Langchain Chain with Tenacity and Vector Retrieval

**Files:**
- Modify: `backend/src/services/summary_chain.py` (or where the chain lives)

- [ ] **Step 1: Retrieve chunks securely and apply Tenacity**
```python
from tenacity import retry, stop_after_attempt, wait_exponential
from sqlalchemy import select
from backend.src.db.models import DocumentChunk

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def run_summary_chain(ctx, document_id: str, user_id: str, format: str):
    # 1. Retrieve chunks MUST FILTER BY user_id
    # session = ...
    # stmt = select(DocumentChunk.text).where(
    #     DocumentChunk.user_id == user_id, 
    #     DocumentChunk.document_id == document_id
    # ).limit(5)
    # result = await session.execute(stmt)
    # chunks = [row[0] for row in result.all()]
    # real_text = "\n".join(chunks)

    # 2. Setup LLM and execute prompt with real_text instead of placeholder
    # ... existing chain logic ...
    pass
```
- [ ] **Step 2: Register function in Worker**
Ensure `run_summary_chain` is registered in the `arq` `WorkerSettings.functions` array in `worker.py`.

- [ ] **Step 3: Commit**
```bash
git add backend/src/api/routers/summaries.py backend/src/services/summary_chain.py
git commit -m "feat(backend): finalize ARQ job dispatch and secure chunk retrieval for summaries"
```
