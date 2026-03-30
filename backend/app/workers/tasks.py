import base64
from datetime import datetime

from sqlmodel import Session, select

from app.core.db import engine
from app.models.document import Document, DocumentStatus
from app.services.minio_client import MinioService
from app.services.ocr import detect_reference, extract_text_from_pdf
from app.services.search_client import SearchService
from app.workers.celery_app import celery_app


@celery_app.task(name="app.workers.tasks.process_document", bind=True, max_retries=3)
def process_document(self, document_id: int, payload_b64: str) -> None:
    minio = MinioService()
    search = SearchService()
    pdf_data = base64.b64decode(payload_b64.encode("utf-8"))

    with Session(engine) as session:
        document = session.exec(select(Document).where(Document.id == document_id)).first()
        if document is None:
            return

        try:
            document.status = DocumentStatus.processing
            document.updated_at = datetime.utcnow()
            session.add(document)
            session.commit()

            object_name = f"raw/{document.id}-{document.original_filename}"
            document.storage_url = minio.upload_bytes(object_name, pdf_data)
            document.storage_key = object_name

            extracted_text = extract_text_from_pdf(pdf_data)
            reference = detect_reference(extracted_text)

            document.extracted_text = extracted_text
            document.extracted_reference = reference
            document.status = DocumentStatus.linked if reference else DocumentStatus.needs_review
            if reference:
                document.linked_reference = reference
            document.updated_at = datetime.utcnow()

            session.add(document)
            session.commit()
            session.refresh(document)

            search.upsert_document(
                {
                    "id": document.id,
                    "filename": document.original_filename,
                    "status": document.status,
                    "reference": document.linked_reference,
                    "extracted_reference": document.extracted_reference,
                    "department": document.department,
                    "document_type": document.document_type,
                    "supplier": document.supplier,
                    "document_year": document.document_year,
                    "text": document.extracted_text or "",
                    "storage_url": document.storage_url,
                }
            )
        except Exception as exc:
            document.status = DocumentStatus.failed
            document.updated_at = datetime.utcnow()
            session.add(document)
            session.commit()
            raise self.retry(exc=exc, countdown=5)
