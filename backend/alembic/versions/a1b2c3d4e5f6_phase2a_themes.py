"""phase2a themes

Revision ID: a1b2c3d4e5f6
Revises: f4d5e6a7b8c9
Create Date: 2026-08-23

Adds the ``themes`` table for the DB-driven theming system (three scopes:
website / splash / app, one default per scope, flexible JSON token blob).
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "f4d5e6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "themes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("scope", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("tokens", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_themes_id", "themes", ["id"])
    op.create_index("ix_themes_scope", "themes", ["scope"])
    op.create_index("ix_themes_scope_default", "themes", ["scope", "is_default"])


def downgrade() -> None:
    op.drop_index("ix_themes_scope_default", table_name="themes")
    op.drop_index("ix_themes_scope", table_name="themes")
    op.drop_index("ix_themes_id", table_name="themes")
    op.drop_table("themes")
