"""Convert document_chunks.embedding to pgvector

Revision ID: 6e7a9c2b4f11
Revises: 00d80590832c
Create Date: 2026-04-18 09:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "6e7a9c2b4f11"
down_revision: Union[str, Sequence[str], None] = "00d80590832c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute(
        """
        ALTER TABLE document_chunks
        ALTER COLUMN embedding TYPE vector(768)
        USING embedding::vector
        """
    )


def downgrade() -> None:
    op.alter_column(
        "document_chunks",
        "embedding",
        existing_type=sa.NullType(),
        type_=sa.ARRAY(sa.Numeric()),
        postgresql_using="embedding::numeric[]",
        existing_nullable=True,
    )
