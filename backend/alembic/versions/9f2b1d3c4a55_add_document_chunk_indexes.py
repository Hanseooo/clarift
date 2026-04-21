"""Add indexes for document chunk retrieval

Revision ID: 9f2b1d3c4a55
Revises: 6e7a9c2b4f11
Create Date: 2026-04-18 15:10:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9f2b1d3c4a55"
down_revision: Union[str, Sequence[str], None] = "6e7a9c2b4f11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_document_chunks_user_document_chunk",
        "document_chunks",
        ["user_id", "document_id", "chunk_index"],
        unique=False,
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_document_chunks_embedding_hnsw "
        "ON document_chunks USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_document_chunks_embedding_hnsw")
    op.drop_index("ix_document_chunks_user_document_chunk", table_name="document_chunks")
