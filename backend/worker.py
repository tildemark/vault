from app.workers.tasks import process_document  # noqa: F401
from app.workers.celery_app import celery_app

__all__ = ["celery_app", "process_document"]
