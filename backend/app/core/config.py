from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "VAULT API"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    database_url: str = "postgresql+psycopg://vault:vault@localhost:5432/vault"
    redis_url: str = "redis://localhost:6379/0"

    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "vault-documents"

    meili_url: str = "http://localhost:7700"
    meili_master_key: str = "masterKey"
    meili_index_name: str = "documents"

    ocr_reference_regex: str = r"PO-\d{5}"

    # Network/local folder watched by the watcher service for new scanner PDFs
    scanner_inbox_path: str = "/inbox"


@lru_cache
def get_settings() -> Settings:
    return Settings()
