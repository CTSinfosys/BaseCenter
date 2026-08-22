"""phase1f website builder module (websites + website_blocks)

Revision ID: d2b3c4e5f6a7
Revises: c1a2b3d4e5f6
Create Date: 2026-08-21 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd2b3c4e5f6a7'
down_revision: Union[str, None] = 'c1a2b3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'websites',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('published', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('settings', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_websites_id'), 'websites', ['id'], unique=False)
    op.create_index(op.f('ix_websites_tenant_id'), 'websites', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_websites_slug'), 'websites', ['slug'], unique=True)

    op.create_table(
        'website_blocks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('website_id', sa.Integer(), nullable=False),
        sa.Column('block_type', sa.String(), nullable=False),
        sa.Column('content', sa.JSON(), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['website_id'], ['websites.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_website_blocks_id'), 'website_blocks', ['id'], unique=False)
    op.create_index(op.f('ix_website_blocks_website_id'), 'website_blocks', ['website_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_website_blocks_website_id'), table_name='website_blocks')
    op.drop_index(op.f('ix_website_blocks_id'), table_name='website_blocks')
    op.drop_table('website_blocks')
    op.drop_index(op.f('ix_websites_slug'), table_name='websites')
    op.drop_index(op.f('ix_websites_tenant_id'), table_name='websites')
    op.drop_index(op.f('ix_websites_id'), table_name='websites')
    op.drop_table('websites')
