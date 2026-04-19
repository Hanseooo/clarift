"""Async S3-compatible service for Cloudflare R2."""

from __future__ import annotations

from typing import BinaryIO

import aioboto3

from src.core.config import settings


class S3Service:
    """Upload/download files from Cloudflare R2 via S3 API."""

    def __init__(self) -> None:
        self._session = aioboto3.Session()
        self._bucket = settings.R2_BUCKET_NAME
        self._client_kwargs = {
            "service_name": "s3",
            "endpoint_url": f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            "aws_access_key_id": settings.R2_ACCESS_KEY_ID,
            "aws_secret_access_key": settings.R2_SECRET_ACCESS_KEY,
            "region_name": "auto",
        }

    async def upload_file(self, file_obj: BinaryIO, object_name: str) -> str:
        """Upload a file object to the configured bucket."""
        async with self._session.client(**self._client_kwargs) as client:
            await client.upload_fileobj(file_obj, self._bucket, object_name)
        return object_name

    async def download_file(self, object_name: str) -> bytes:
        """Download an object and return raw bytes."""
        async with self._session.client(**self._client_kwargs) as client:
            response = await client.get_object(Bucket=self._bucket, Key=object_name)
            return await response["Body"].read()
