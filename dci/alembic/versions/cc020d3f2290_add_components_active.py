#
# Copyright (C) 2016 Red Hat, Inc
#
# Licensed under the Apache License, Version 2.0 (the "License"); you may
# not use this file except in compliance with the License. You may obtain
# a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.

"""add components.active

Revision ID: cc020d3f2290
Revises: c6b58b245108
Create Date: 2016-09-23 15:32:24.337799

"""

# revision identifiers, used by Alembic.
revision = 'cc020d3f2290'
down_revision = '98a71b5c0786'
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.add_column('components',
                  sa.Column('active', sa.BOOLEAN, default=True))


def downgrade():
    pass
