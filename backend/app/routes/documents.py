import base64
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import func, or_
from sqlmodel import Session, select

from app.core.db import get_session
from app.models.document import Document, DocumentStatus
from app.schemas.document import BrowseFacetsResponse, DocumentRead, FacetCount, IngestResponse, LinkDocumentRequest
from app.services.search_client import SearchService
from app.workers.tasks import process_document

router = APIRouter(prefix="/documents", tags=["documents"])


def _clean_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = " ".join(value.strip().split())
    return cleaned or None


def _build_filters(
    department: Optional[str],
    document_year: Optional[int],
    document_type: Optional[str],
    supplier: Optional[str],
    q: Optional[str],
) -> list:
    filters: list = []
    if department:
        filters.append(Document.department == department)
    if document_year is not None:
        filters.append(Document.document_year == document_year)
    if document_type:
        filters.append(Document.document_type == document_type)
    if supplier:
        filters.append(Document.supplier == supplier)
    if q:
        wildcard = f"%{q}%"
        filters.append(
            or_(
                Document.original_filename.ilike(wildcard),
                Document.extracted_text.ilike(wildcard),
                Document.extracted_reference.ilike(wildcard),
                Document.linked_reference.ilike(wildcard),
            )
        )
    return filters


def _as_document_read_list(docs: list[Document]) -> list[DocumentRead]:
    return [DocumentRead.model_validate(doc) for doc in docs]


def _facet_rows_to_counts(rows: list[tuple[object, object]]) -> list[FacetCount]:
    counts: list[FacetCount] = []
    for value, count in rows:
        if value is None or str(value).strip() == "":
            continue
        counts.append(FacetCount(value=str(value), count=int(count)))
    return counts


@router.post("/ingest", response_model=IngestResponse)
async def ingest_document(
    file: UploadFile = File(...),
    department: Optional[str] = Form(default=None),
    document_year: Optional[int] = Form(default=None),
    document_type: Optional[str] = Form(default=None, alias="type"),
    supplier: Optional[str] = Form(default=None),
    session: Session = Depends(get_session),
) -> IngestResponse:
    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty file")

    document = Document(
        original_filename=file.filename or "upload.pdf",
        status=DocumentStatus.queued,
        department=_clean_text(department),
        document_year=document_year,
        document_type=_clean_text(document_type),
        supplier=_clean_text(supplier),
    )
    session.add(document)
    session.commit()
    session.refresh(document)

    encoded_payload = base64.b64encode(payload).decode("utf-8")
    task = process_document.delay(document.id, encoded_payload)
    return IngestResponse(document_id=document.id, task_id=task.id, status=document.status)


@router.get("/triage", response_model=list[DocumentRead])
def list_triage_documents(session: Session = Depends(get_session)) -> list[DocumentRead]:
    docs = session.exec(
        select(Document)
        .where(Document.status == DocumentStatus.needs_review)
        .order_by(Document.created_at.desc())
    ).all()
    return _as_document_read_list(docs)


@router.get("", response_model=list[DocumentRead])
def list_documents(session: Session = Depends(get_session)) -> list[DocumentRead]:
    docs = session.exec(select(Document).order_by(Document.created_at.desc())).all()
    return _as_document_read_list(docs)


@router.get("/browse", response_model=list[DocumentRead])
def browse_documents(
    department: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    type: Optional[str] = Query(default=None),
    supplier: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None, min_length=2),
    session: Session = Depends(get_session),
) -> list[DocumentRead]:
    filters = _build_filters(
        department=_clean_text(department),
        document_year=year,
        document_type=_clean_text(type),
        supplier=_clean_text(supplier),
        q=_clean_text(q),
    )

    statement = select(Document).where(*filters).order_by(Document.created_at.desc())
    docs = session.exec(statement).all()
    return _as_document_read_list(docs)


@router.get("/facets", response_model=BrowseFacetsResponse)
def browse_facets(
    department: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    type: Optional[str] = Query(default=None),
    supplier: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None, min_length=2),
    session: Session = Depends(get_session),
) -> BrowseFacetsResponse:
    filters = _build_filters(
        department=_clean_text(department),
        document_year=year,
        document_type=_clean_text(type),
        supplier=_clean_text(supplier),
        q=_clean_text(q),
    )

    department_rows = session.exec(
        select(Document.department, func.count(Document.id))
        .where(*filters, Document.department.is_not(None), Document.department != "")
        .group_by(Document.department)
        .order_by(func.count(Document.id).desc(), Document.department)
    ).all()

    year_rows = session.exec(
        select(Document.document_year, func.count(Document.id))
        .where(*filters, Document.document_year.is_not(None))
        .group_by(Document.document_year)
        .order_by(Document.document_year.desc())
    ).all()

    type_rows = session.exec(
        select(Document.document_type, func.count(Document.id))
        .where(*filters, Document.document_type.is_not(None), Document.document_type != "")
        .group_by(Document.document_type)
        .order_by(func.count(Document.id).desc(), Document.document_type)
    ).all()

    supplier_rows = session.exec(
        select(Document.supplier, func.count(Document.id))
        .where(*filters, Document.supplier.is_not(None), Document.supplier != "")
        .group_by(Document.supplier)
        .order_by(func.count(Document.id).desc(), Document.supplier)
    ).all()

    return BrowseFacetsResponse(
        departments=_facet_rows_to_counts(department_rows),
        years=_facet_rows_to_counts(year_rows),
        types=_facet_rows_to_counts(type_rows),
        suppliers=_facet_rows_to_counts(supplier_rows),
    )


@router.patch("/{document_id}/link", response_model=DocumentRead)
def link_document(
    document_id: int,
    body: LinkDocumentRequest,
    session: Session = Depends(get_session),
) -> DocumentRead:
    document = session.exec(select(Document).where(Document.id == document_id)).first()
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    document.linked_reference = body.reference
    document.status = DocumentStatus.linked
    if body.department is not None:
        document.department = _clean_text(body.department)
    if body.document_type is not None:
        document.document_type = _clean_text(body.document_type)
    if body.supplier is not None:
        document.supplier = _clean_text(body.supplier)
    if body.document_year is not None:
        document.document_year = body.document_year
    document.updated_at = datetime.utcnow()
    session.add(document)
    session.commit()
    session.refresh(document)

    return DocumentRead.model_validate(document)


@router.get("/search", response_model=list[DocumentRead])
def search_documents(
    q: str = Query(..., min_length=2),
    session: Session = Depends(get_session),
) -> list[DocumentRead]:
    search = SearchService()
    hits = search.search(q)

    if not hits:
        return []

    ids = [item["id"] for item in hits if "id" in item]
    docs = session.exec(select(Document).where(Document.id.in_(ids))).all()
    doc_map = {doc.id: doc for doc in docs}

    ordered = [doc_map[item_id] for item_id in ids if item_id in doc_map]
    return _as_document_read_list(ordered)
