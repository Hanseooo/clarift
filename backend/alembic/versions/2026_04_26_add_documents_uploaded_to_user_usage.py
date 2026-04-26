"""add documents_uploaded to user_usage

Revision ID: 2026_04_26_add_documents_uploaded
Revises: e24932d2e428
Create Date: 2026-04-26 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "2026_04_26_add_documents_uploaded"
down_revision = "e24932d2e428"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "user_usage",
        sa.Column("documents_uploaded", sa.Integer(), server_default="0", nullable=False),
    )


def downgrade():
    op.drop_column("user_usage", "documents_uploaded")
