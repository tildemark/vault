# VAULT (Virtual Archive & Upload List Tracker)

> An enterprise-grade, self-hosted document management and retrieval system designed to automate the ingestion, processing, and indexing of physical scans for lightning-fast audit retrieval.

## 📖 Overview

VAULT bridges the gap between physical paper trails and digital audits. By integrating directly with enterprise network scanners (like the Fujifilm Apeos C2450), VAULT automatically detects new document scans, processes them through an asynchronous Optical Character Recognition (OCR) pipeline, and attempts to automatically link them to existing business records (like Purchase Orders) using Smart Regex. 

For documents that require human verification, VAULT provides a streamlined "Triage Queue" desktop application for on-premise staff, while offering secure web-based access for remote users.

## ✨ Key Features

* **Automated Network Ingestion:** Instantly detects and queues new PDF scans dropped into shared SMB/FTP network folders.
* **Asynchronous Processing:** Utilizes a Redis + Celery task queue to handle heavy OCR workloads without impacting system performance.
* **Hybrid Indexing (Smart Regex + Manual Triage):** Automatically links highly-confident document matches (e.g., `PO-12345`) to database records. Unrecognized files are routed to a human-in-the-loop review queue.
* **Audit-Ready Search:** Fully indexed OCR text powered by Meilisearch, allowing staff to instantly locate documents by vendor name, line item, or ID.
* **Unified Client Architecture:** A single React/Vue UI codebase served as a blazing-fast native desktop app (via Tauri/Rust) for local staff, and as a standard web app for remote access.
* **Developer-Friendly API:** Auto-generated Swagger documentation via FastAPI for easy integration with external ERP and accounting software.

## 🛠️ Technology Stack

**Backend & Infrastructure**
* **API:** Python 3.11+ / FastAPI
* **Task Queue:** Redis (Broker) + Celery (Workers)
* **Database:** PostgreSQL (Relational metadata & linking)
* **Object Storage:** MinIO (S3-compatible, self-hosted vault for raw PDFs)
* **Search Engine:** Meilisearch (Typo-tolerant full-text search)

**Frontend & Desktop Client**
* **Web UI:** React (or Vue) + Tailwind CSS
* **Desktop Wrapper:** Tauri (Rust)

## 📂 Project Structure

```text
vault/
├── agent.md                # Context file for Google Antigravity IDE / AI Agents
├── docker-compose.yml      # Infrastructure orchestration (Postgres, MinIO, Redis, Meilisearch)
├── backend/                # FastAPI application and Celery workers
│   ├── main.py             # FastAPI entry point
│   ├── worker.py           # Celery OCR tasks
│   ├── models/             # Database schemas (SQLAlchemy/SQLModel)
│   ├── routes/             # API endpoints
│   └── static/             # Swagger UI custom branding (logos)
├── frontend/               # React/Vue UI codebase
│   ├── public/             # Web favicons and static assets
│   ├── src/
│   │   ├── assets/         # UI Logos and images
│   │   ├── components/     # Reusable UI elements
│   │   └── pages/          # Triage Dashboard, Search View, etc.
│   └── src-tauri/          # Tauri Rust configuration and Desktop App Icons
└── README.md
```

## 🚀 Getting Started

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* [Python 3.11+](https://www.python.org/downloads/)
* [Node.js & npm](https://nodejs.org/en/)
* [Rust](https://www.rust-lang.org/tools/install) (For building the Tauri desktop app)

### 1. Spin up the Infrastructure
Start the core services (PostgreSQL, MinIO, Redis, Meilisearch) using Docker:
```bash
docker-compose up -d
```

### 2. Start the Backend (FastAPI + Celery)
Navigate to the backend directory, install dependencies, and start the server and worker:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
celery -A worker worker --loglevel=info
```
*API Documentation will be available at: `http://localhost:8000/docs`*

### 3. Start the Frontend (Tauri Desktop App)
Navigate to the frontend directory, install dependencies, and launch the Tauri dev window:
```bash
cd frontend
npm install
npm run tauri dev
```

## 🔒 Security & Deployment
* **Environment Variables:** Never commit `.env` files. Ensure all credentials (MinIO keys, Postgres passwords) are securely injected.
* **Remote Access:** The web interface should not be exposed directly to the public internet. Use a Zero Trust tunnel (e.g., Cloudflare Tunnels) or a VPN (e.g., Tailscale) for off-site staff.
