# Changelog

All notable changes to this project will be documented in this file.

## v0.1.0 - 2026-03-30

Initial implementation release of VAULT following semantic versioning (vMajor.Minor.Patch).

### Added
- FastAPI backend with document ingestion, triage, manual linking, search, browse, and facet endpoints.
- Celery + Redis asynchronous OCR pipeline with regex-based auto-linking.
- PostgreSQL document metadata model with browse fields: department, document_type, supplier, and document_year.
- MinIO object storage integration for uploaded PDF files.
- Meilisearch integration with explicit BM25-style ranking settings.
- React + Vite + TypeScript web UI with Shadcn component primitives.
- Dashboard tabs for Ingest, Triage Queue, Search, and Metadata Browse.
- Tauri desktop scaffold in src-tauri for on-prem desktop packaging.
- Watchdog scanner inbox service for automatic PDF pickup and queueing.

### Changed
- UI redesigned to use VAULT logo/icon branding and a higher-contrast dark navy visual theme.
- Status badges and dashboard cards updated for improved readability and operational clarity.

### Infrastructure
- Docker Compose stack expanded to include backend, worker, watcher, frontend, postgres, redis, minio, and meilisearch.

### Documentation
- README, architecture docs, and agent guidance updated for Browse, BM25 relevance, and Shadcn/Tauri alignment.
