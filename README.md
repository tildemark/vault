# VAULT (Virtual Archive & Upload List Tracker)

Enterprise-grade, self-hosted document management with asynchronous OCR, Smart Regex linking, triage review, full-text search, and structured browse navigation.

## What Is Implemented

- FastAPI backend with document ingest, triage queue, linking, search, and browse-ready metadata endpoints.
- Celery worker pipeline for OCR extraction and regex-based auto-linking.
- PostgreSQL metadata storage via SQLModel.
- MinIO object storage for raw PDF files.
- Meilisearch indexing for audit-ready document retrieval.
- React + Tailwind UI using Shadcn-style components for dashboard workflows.
- Docker Compose stack for one-command local startup.

## Retrieval Modes

VAULT supports two complementary retrieval modes:

- Search: Full-text and keyword discovery powered by OCR indexing.
- Browse: Structured navigation by metadata facets such as department, year, document type, supplier, and other business tags.

Browse is intended for users who know the business context but not the exact text inside a document.

## Stack

- API: FastAPI (Python 3.11)
- Worker Queue: Celery + Redis
- Database: PostgreSQL
- Object Storage: MinIO (S3 compatible)
- Search: Meilisearch with BM25-style relevance ranking
- UI: React + Vite + Tailwind + Shadcn component structure

## Search Relevance (BM25)

VAULT uses Meilisearch's BM25-style relevance scoring pipeline for keyword search quality, tuned with ranking rules and searchable attributes for OCR-heavy documents.

Ranking focus:

- Prioritize exact and semantically close matches in extracted OCR text.
- Keep important metadata fields searchable (filename, supplier, department, type, references).
- Support typo tolerance while preserving high-confidence exact matches.

## Project Layout

```text
vault/
|-- backend/
|   |-- app/
|   |   |-- core/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- schemas/
|   |   |-- services/
|   |   `-- workers/
|   |-- main.py
|   |-- worker.py
|   |-- requirements.txt
|   `-- Dockerfile
|-- frontend/
|   |-- src/
|   |   |-- components/ui/      # Shadcn-style primitives
|   |   |-- pages/
|   |   |-- lib/
|   |   `-- main.tsx
|   |-- components.json         # Shadcn config
|   |-- package.json
|   `-- Dockerfile
|-- docker-compose.yml
`-- docs/
```

## Run With Docker

```bash
docker compose up -d --build
```

Services:

- API docs: http://localhost:8000/docs
- Frontend dashboard: http://localhost:5173
- MinIO console: http://localhost:9001
- Meilisearch: http://localhost:7700

## Run Locally (Without Docker)

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

In a second terminal:

```bash
cd backend
celery -A worker.celery_app worker --loglevel=info
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

- `POST /documents/ingest` - Upload PDF and enqueue OCR pipeline
- `GET /documents` - List all documents
- `GET /documents/triage` - List only `needs_review` documents
- `PATCH /documents/{id}/link` - Manually link a triage document
- `GET /documents/search?q=...` - Search OCR and linked records
- `GET /documents/browse` - Browse documents by facet filters (for example `department`, `year`, `type`, `supplier`)
- `GET /documents/facets` - Fetch available browse facets and counts for the current filter context
- `GET /health` - Health check

Example browse query:

```http
GET /documents/browse?department=procurement&year=2025&type=invoice&supplier=acme
```

Notes:

- Browse endpoints rely on document metadata quality.
- Facet values should be normalized at ingestion and during manual triage to avoid duplicates like `ACME`, `Acme`, `Acme Inc.`.

## Shadcn UI Note

The frontend is structured with Shadcn conventions:

- `frontend/components.json` for aliases and Tailwind integration
- reusable primitives in `frontend/src/components/ui`
- utility helper `cn()` in `frontend/src/lib/utils.ts`

You can add more components later with the Shadcn CLI without restructuring.
