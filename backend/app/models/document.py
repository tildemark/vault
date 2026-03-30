from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class DocumentStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    needs_review = "needs_review"
    linked = "linked"
    failed = "failed"


def _current_year() -> int:
    return datetime.utcnow().year


class Document(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    original_filename: str
    storage_key: Optional[str] = None
    storage_url: Optional[str] = None
    status: DocumentStatus = Field(default=DocumentStatus.queued)
    extracted_text: Optional[str] = None
    extracted_reference: Optional[str] = None
    linked_reference: Optional[str] = None
    department: Optional[str] = None
    document_type: Optional[str] = None
    supplier: Optional[str] = None
    document_year: Optional[int] = Field(default_factory=_current_year)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
