from fastapi import FastAPI

from app.core.config import get_settings
from app.core.db import init_db
from app.routes.documents import router as documents_router
from app.services.minio_client import MinioService
from app.services.search_client import SearchService

settings = get_settings()
app = FastAPI(title=settings.app_name)

app.include_router(documents_router)


@app.on_event("startup")
def startup() -> None:
    init_db()
    MinioService().ensure_bucket()
    SearchService().ensure_index()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
