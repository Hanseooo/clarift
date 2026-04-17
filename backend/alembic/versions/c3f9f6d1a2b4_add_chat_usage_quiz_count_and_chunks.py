"""Add chat usage, quiz count, and document chunks

Revision ID: c3f9f6d1a2b4
Revises: d5d65b3a5669
Create Date: 2026-04-16 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3f9f6d1a2b4"
down_revision: Union[str, Sequence[str], None] = "d5d65b3a5669"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_usage",
        sa.Column("chat_used", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )
    op.add_column(
        "user_topic_performance",
        sa.Column("quiz_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )
    op.create_table(
        "document_chunks",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("document_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", postgresql.ARRAY(sa.Numeric()), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("document_chunks")
    op.drop_column("user_topic_performance", "quiz_count")
    op.drop_column("user_usage", "chat_used")
