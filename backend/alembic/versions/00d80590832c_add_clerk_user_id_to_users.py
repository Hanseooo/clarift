"""Add clerk_user_id to users

Revision ID: 00d80590832c
Revises: c3f9f6d1a2b4
Create Date: 2026-04-17 10:13:56.517775

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '00d80590832c'
down_revision: Union[str, Sequence[str], None] = 'c3f9f6d1a2b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add the clerk_user_id field as nullable (safe for existing dev data)
    op.add_column('users', sa.Column('clerk_user_id', sa.Text(), nullable=True))
    # 2. Add a unique constraint for clerk_user_id
    op.create_unique_constraint('uq_users_clerk_user_id', 'users', ['clerk_user_id'])
def downgrade() -> None:
    # Remove the unique constraint and column
    op.drop_constraint('uq_users_clerk_user_id', 'users', type_='unique')
    op.drop_column('users', 'clerk_user_id')
