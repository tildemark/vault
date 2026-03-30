from typing import Generator

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import get_settings

settings = get_settings()
engine = create_engine(settings.database_url, echo=False)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    with engine.begin() as conn:
        # Keep local/dev databases forward-compatible when adding browse metadata fields.
        conn.execute(text("ALTER TABLE document ADD COLUMN IF NOT EXISTS department VARCHAR"))
        conn.execute(text("ALTER TABLE document ADD COLUMN IF NOT EXISTS document_type VARCHAR"))
        conn.execute(text("ALTER TABLE document ADD COLUMN IF NOT EXISTS supplier VARCHAR"))
        conn.execute(text("ALTER TABLE document ADD COLUMN IF NOT EXISTS document_year INTEGER"))
        conn.execute(text("UPDATE document SET document_year = EXTRACT(YEAR FROM created_at) WHERE document_year IS NULL"))


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
