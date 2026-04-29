"""add_document_status_check_constraint

Revision ID: bda1912fcc31
Revises: 2026_04_26_add_documents_uploaded
Create Date: 2026-04-29 17:09:51.850213

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "bda1912fcc31"
down_revision: Union[str, Sequence[str], None] = "2026_04_26_add_documents_uploaded"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Migrate document statuses and add check constraint."""
    # Step 1: Update any existing "completed" documents to "ready"
    op.execute("UPDATE documents SET status = 'ready' WHERE status = 'completed'")

    # Step 2: Add check constraint to enforce valid statuses
    op.create_check_constraint(
        "ck_documents_status",
        "documents",
        sa.text("status IN ('pending', 'processing', 'ready', 'failed')"),
    )


def downgrade() -> None:
    """Remove check constraint."""
    op.drop_constraint("ck_documents_status", "documents", type_="check")
