from io import BytesIO
from urllib.parse import urljoin

import boto3
from botocore.client import Config

from app.core.config import get_settings

settings = get_settings()


class MinioService:
    def __init__(self) -> None:
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.minio_endpoint,
            aws_access_key_id=settings.minio_access_key,
            aws_secret_access_key=settings.minio_secret_key,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )

    def ensure_bucket(self) -> None:
        buckets = self.client.list_buckets().get("Buckets", [])
        if not any(b["Name"] == settings.minio_bucket for b in buckets):
            self.client.create_bucket(Bucket=settings.minio_bucket)

    def upload_bytes(self, object_name: str, data: bytes, content_type: str = "application/pdf") -> str:
        self.client.upload_fileobj(
            Fileobj=BytesIO(data),
            Bucket=settings.minio_bucket,
            Key=object_name,
            ExtraArgs={"ContentType": content_type},
        )
        return urljoin(f"{settings.minio_endpoint}/", f"{settings.minio_bucket}/{object_name}")
