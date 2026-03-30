from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from pydantic import ConfigDict

from app.models.document import DocumentStatus


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_filename: str
    storage_url: Optional[str]
    status: DocumentStatus
    extracted_reference: Optional[str]
    linked_reference: Optional[str]
    department: Optional[str]
    document_type: Optional[str]
    supplier: Optional[str]
    document_year: Optional[int]
    created_at: datetime
    updated_at: datetime


class LinkDocumentRequest(BaseModel):
    reference: str
    department: Optional[str] = None
    document_type: Optional[str] = None
    supplier: Optional[str] = None
    document_year: Optional[int] = None


class IngestResponse(BaseModel):
    document_id: int
    task_id: str
    status: DocumentStatus


class FacetCount(BaseModel):
    value: str
    count: int


class BrowseFacetsResponse(BaseModel):
    departments: list[FacetCount]
    years: list[FacetCount]
    types: list[FacetCount]
    suppliers: list[FacetCount]
