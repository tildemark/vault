## System Architecture Document: 

## Project: Automated Document Management & Retrieval System

### 1. Executive Summary
This document outlines the architecture for a self-hosted, automated document management system. It is designed to ingest scanned physical documents from network-attached scanners, extract searchable text via Optical Character Recognition (OCR), automatically link documents using Regex parsing, and provide a lightning-fast search interface for audit and retrieval purposes.

### 2. Technology Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Physical Hardware** | Fujifilm Apeos C2450 | Enterprise MFP scanner pushing PDFs via SMB/FTP. |
| **Ingestion Monitor** | Python (`watchdog`) | Monitors the network folder for new incoming scans. |
| **Task Queue** | Redis + Celery | Manages asynchronous OCR workloads to prevent server crashes. |
| **Backend API** | Python (FastAPI) | Core business logic, routing, and auto-generated Swagger UI. |
| **Object Storage** | MinIO | S3-compatible self-hosted vault for the physical PDF files. |
| **Relational Database** | PostgreSQL | Stores metadata, document status, and MinIO file paths. |
| **Search Engine** | Meilisearch | Ultra-fast, typo-tolerant full-text search engine for OCR data. |
| **On-Premise Client** | Rust (Tauri) + React/Vue | Lightweight, native desktop application for branch staff. |
| **Remote Client** | React/Vue (Web) | Browser-based access for off-site staff via secure tunnel. |

### 3. Core System Architecture
The system is divided into distinct, decoupled layers to ensure that if one part fails (e.g., the OCR engine gets overloaded), the rest of the system (like the search API and scanner ingestion) remains online.



#### A. Ingestion & Message Broker Layer
The Fujifilm scanner is configured with a "Scan to Network" profile. When a document is scanned, the PDF is saved to a shared local directory (e.g., `//server/scanner_inbox`). A Python script utilizing the `watchdog` library monitors this folder. When a new file is detected, the script does not process the file immediately. Instead, it pushes a message to **Redis** containing the file path, creating a robust processing queue.

#### B. Asynchronous Processing Layer (Celery Workers)
Background workers powered by **Celery** continuously listen to the Redis queue. 
1. A worker picks up a task and reads the PDF.
2. It uploads the raw PDF to **MinIO** and receives a permanent secure URL.
3. It runs the document through an OCR engine (like `pytesseract` or `pdfplumber`) to extract the raw text.



#### C. Database & Search Layer
Once the Celery worker has the extracted text and the MinIO URL, it pushes the data to two locations:
1. **PostgreSQL:** Stores the rigid, relational data (Upload Date, File URL, Processing Status, Assigned PO Number).
2. **Meilisearch:** Ingests the raw extracted OCR text, making the document instantly searchable by any keyword, vendor name, or line item.

#### D. API & Presentation Layer
**FastAPI** acts as the central hub. It provides RESTful endpoints for the frontend applications to query Meilisearch and fetch documents from MinIO. It also exposes a `/docs` endpoint, serving an interactive **Swagger UI** for future integrations with external ERP or accounting software. 

The user interface is built using standard web technologies (like React or Vue). For on-premise staff, this UI is wrapped in **Tauri**, providing a fast, secure, native desktop experience. For remote staff, the exact same UI is served over a secure VPN or Cloudflare Tunnel as a standard web application.

---

### 4. Document Linking Workflow (Hybrid Automation)

To link a raw scanned file (e.g., `scan_001.pdf`) to a specific business record (e.g., "Purchase Order #12345"), the system uses a hybrid approach combining Smart Regex (Flow C) and a Manual Triage Queue (Flow A).

**Step 1: Smart Regex Attempt (Flow C)**
During the Celery OCR process, the system applies Regular Expressions to the extracted text to find known patterns (e.g., `PO-\d{5}` or `INV-\w+`). 
* **High Confidence Match:** If the system clearly identifies "PO-12345", it automatically updates PostgreSQL, marking the document as `Status: Linked` and tying it to that PO number. The document is instantly archived and searchable.
* **Low Confidence / No Match:** If the scan is blurry, handwriting is used, or no recognized pattern is found, the system saves the document to PostgreSQL with `Status: Needs Review`.

**Step 2: Manual Triage Queue (Flow A)**
Documents marked as `Needs Review` populate a specific dashboard in the Tauri Desktop App.
1.  A staff member opens the "Triage Queue" tab.
2.  The UI displays a split-screen: the PDF viewer on the left, and a data-entry form on the right.
3.  The staff member visually identifies the document, types in the missing PO number or Vendor Name, and clicks "Link Document."
4.  FastAPI updates the PostgreSQL record to `Status: Linked`, removing it from the Triage Queue.
