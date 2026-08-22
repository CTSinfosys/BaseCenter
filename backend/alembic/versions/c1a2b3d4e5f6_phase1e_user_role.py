"""phase1e add user role column

Revision ID: c1a2b3d4e5f6
Revises: b879cb709462
Create Date: 2026-08-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, None] = 'b879cb709462'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tenant-scoped role for users: 'tenant_admin' or 'member'.
    # server_default ensures existing rows migrate cleanly.
    op.add_column(
        'users',
        sa.Column('role', sa.String(), nullable=False, server_default='member'),
    )
    # Promote existing tenant owners to tenant_admin so current data stays consistent.
    op.execute(
        """
        UPDATE users
        SET role = 'tenant_admin'
        FROM tenants
        WHERE tenants.owner_id = users.id
        """
    )


def downgrade() -> None:
    op.drop_column('users', 'role')
