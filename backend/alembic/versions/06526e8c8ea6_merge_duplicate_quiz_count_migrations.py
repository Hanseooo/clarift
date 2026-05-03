"""merge duplicate quiz_count migrations

Revision ID: 06526e8c8ea6
Revises: 0d0dc7af00b2, b0b2631e291c
Create Date: 2026-04-30 01:15:05.320602

"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = '06526e8c8ea6'
down_revision: Union[str, Sequence[str], None] = ('0d0dc7af00b2', 'b0b2631e291c')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
