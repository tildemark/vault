"""
Scanner inbox watcher — monitors a local/network folder for new PDF files
and automatically enqueues them for OCR processing via Celery.
"""
from __future__ import annotations

import logging
import time
from pathlib import Path

from watchdog.events import FileCreatedEvent, FileSystemEventHandler
from watchdog.observers import Observer

logger = logging.getLogger(__name__)

# How long (seconds) to wait after a file appears before reading it,
# giving the scanner time to finish writing the file.
_SETTLE_SECONDS = 2.0


class ScannerInboxHandler(FileSystemEventHandler):
    """Fires whenever a new file is created in the inbox directory."""

    def on_created(self, event: FileCreatedEvent) -> None:  # type: ignore[override]
        if event.is_directory:
            return
        src_path = Path(event.src_path)
        if src_path.suffix.lower() != ".pdf":
            logger.debug("Skipping non-PDF file: %s", src_path.name)
            return
        # Wait for the file to be fully written
        time.sleep(_SETTLE_SECONDS)
        self._ingest(src_path)

    def _ingest(self, pdf_path: Path) -> None:
        import base64

        # Lazy imports so the module can be imported without a running DB/broker
        from app.core.db import get_session  # type: ignore[import]
        from app.models.document import Document, DocumentStatus  # type: ignore[import]
        from app.workers.tasks import process_document  # type: ignore[import]

        logger.info("New scan detected: %s", pdf_path.name)

        try:
            raw_bytes = pdf_path.read_bytes()
        except OSError as exc:
            logger.error("Cannot read %s: %s", pdf_path, exc)
            return

        # Create a PostgreSQL record so the UI shows the queued document immediately
        with get_session() as session:
            doc = Document(
                original_filename=pdf_path.name,
                status=DocumentStatus.queued,
            )
            session.add(doc)
            session.commit()
            session.refresh(doc)
            document_id = doc.id

        # Encode the PDF and hand it off to the Celery worker
        encoded = base64.b64encode(raw_bytes).decode()
        process_document.delay(document_id, encoded, pdf_path.name)
        logger.info("Queued document #%d (%s) for OCR", document_id, pdf_path.name)


def run_watcher(inbox_path: str) -> None:
    """Start the blocking watchdog observer loop."""
    path = Path(inbox_path)
    path.mkdir(parents=True, exist_ok=True)
    logger.info("VAULT Watcher: monitoring %s", path.resolve())

    observer = Observer()
    observer.schedule(ScannerInboxHandler(), str(path), recursive=False)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("VAULT Watcher: shutting down")
    finally:
        observer.stop()
        observer.join()
