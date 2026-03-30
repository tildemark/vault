"""
Entry-point for the VAULT scanner inbox watcher service.

Usage:
    python watcher_entrypoint.py

Docker:
    command: python watcher_entrypoint.py
"""
import logging

from app.core.config import get_settings
from app.core.db import init_db
from app.services.watcher import run_watcher

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

if __name__ == "__main__":
    settings = get_settings()
    init_db()
    run_watcher(settings.scanner_inbox_path)
