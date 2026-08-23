"""phase2b content

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-23

Adds the ``page_sections`` table for the lightweight CMS / content editor.
Each managed public page (``website`` = ``/``, ``splash`` = ``/modules``) is an
ordered list of sections. Content is a flexible JSON blob keyed by section
``type`` so new block types need no schema migration.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "page_sections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("page", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_visible", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_page_sections_id", "page_sections", ["id"])
    op.create_index("ix_page_sections_page", "page_sections", ["page"])
    op.create_index("ix_page_sections_page_position", "page_sections", ["page", "position"])


def downgrade() -> None:
    op.drop_index("ix_page_sections_page_position", table_name="page_sections")
    op.drop_index("ix_page_sections_page", table_name="page_sections")
    op.drop_index("ix_page_sections_id", table_name="page_sections")
    op.drop_table("page_sections")
