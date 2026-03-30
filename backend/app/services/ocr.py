import re
from io import BytesIO
from typing import Optional

import pdfplumber

from app.core.config import get_settings

settings = get_settings()


def extract_text_from_pdf(pdf_data: bytes) -> str:
    text_parts: list[str] = []
    with pdfplumber.open(BytesIO(pdf_data)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            if text:
                text_parts.append(text)
    return "\n".join(text_parts).strip()


def detect_reference(text: str) -> Optional[str]:
    match = re.search(settings.ocr_reference_regex, text)
    return match.group(0) if match else None
