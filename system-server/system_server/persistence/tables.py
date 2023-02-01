"""SQLite table schemas."""
import sqlalchemy
from sqlalchemy import Column, Integer

_metadata = sqlalchemy.MetaData()


registration_table = sqlalchemy.Table(
    "registration",
    _metadata,
    Column("registration_id", Integer, primary_key=True, nullable=False),
    Column("subject", sqlalchemy.String, nullable=True),
    Column("agent", sqlalchemy.String, nullable=True),
    Column("agent_id", sqlalchemy.String, nullable=True),
    Column("token", sqlalchemy.String, nullable=True),
    Column("schema_version", Integer, nullable=False, default=0, server_default="0"),
    sqlalchemy.UniqueConstraint("subject", "agent", "agent_id"),
)


def add_tables_to_db(sql_engine: sqlalchemy.engine.Engine) -> None:
    """Create the necessary database tables to back all data stores.

    Params:
        sql_engine: An engine for a blank SQL database, to put the tables in.
    """
    _metadata.create_all(sql_engine)
