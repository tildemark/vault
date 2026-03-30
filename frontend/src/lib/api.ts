export type DocumentStatus = "queued" | "processing" | "needs_review" | "linked" | "failed";

export interface DocumentItem {
  id: number;
  original_filename: string;
  storage_url: string | null;
  status: DocumentStatus;
  extracted_reference: string | null;
  linked_reference: string | null;
  department: string | null;
  document_type: string | null;
  supplier: string | null;
  document_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface BrowseFacets {
  departments: FacetCount[];
  years: FacetCount[];
  types: FacetCount[];
  suppliers: FacetCount[];
}

export interface BrowseFilters {
  department?: string;
  year?: number;
  type?: string;
  supplier?: string;
  q?: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function ingestDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/documents/ingest`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to ingest document");
  }

  return response.json();
}

export async function ingestDocumentWithMetadata(
  file: File,
  metadata: { department?: string; year?: number; type?: string; supplier?: string }
) {
  const formData = new FormData();
  formData.append("file", file);
  if (metadata.department) {
    formData.append("department", metadata.department);
  }
  if (typeof metadata.year === "number" && !Number.isNaN(metadata.year)) {
    formData.append("document_year", String(metadata.year));
  }
  if (metadata.type) {
    formData.append("type", metadata.type);
  }
  if (metadata.supplier) {
    formData.append("supplier", metadata.supplier);
  }

  const response = await fetch(`${API_BASE}/documents/ingest`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to ingest document");
  }

  return response.json();
}

export async function fetchAllDocuments(): Promise<DocumentItem[]> {
  const response = await fetch(`${API_BASE}/documents`);
  if (!response.ok) {
    throw new Error("Failed to fetch documents");
  }
  return response.json();
}

export async function fetchTriageDocuments(): Promise<DocumentItem[]> {
  const response = await fetch(`${API_BASE}/documents/triage`);
  if (!response.ok) {
    throw new Error("Failed to fetch triage queue");
  }
  return response.json();
}

export async function linkDocument(id: number, reference: string): Promise<DocumentItem> {
  const response = await fetch(`${API_BASE}/documents/${id}/link`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reference }),
  });

  if (!response.ok) {
    throw new Error("Failed to link document");
  }

  return response.json();
}

export async function searchDocuments(query: string): Promise<DocumentItem[]> {
  const response = await fetch(`${API_BASE}/documents/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error("Failed to search documents");
  }
  return response.json();
}

function buildBrowseQuery(filters: BrowseFilters) {
  const params = new URLSearchParams();
  if (filters.department) {
    params.set("department", filters.department);
  }
  if (typeof filters.year === "number" && !Number.isNaN(filters.year)) {
    params.set("year", String(filters.year));
  }
  if (filters.type) {
    params.set("type", filters.type);
  }
  if (filters.supplier) {
    params.set("supplier", filters.supplier);
  }
  if (filters.q) {
    params.set("q", filters.q);
  }
  return params.toString();
}

export async function browseDocuments(filters: BrowseFilters): Promise<DocumentItem[]> {
  const query = buildBrowseQuery(filters);
  const response = await fetch(`${API_BASE}/documents/browse${query ? `?${query}` : ""}`);
  if (!response.ok) {
    throw new Error("Failed to browse documents");
  }
  return response.json();
}

export async function fetchBrowseFacets(filters: BrowseFilters): Promise<BrowseFacets> {
  const query = buildBrowseQuery(filters);
  const response = await fetch(`${API_BASE}/documents/facets${query ? `?${query}` : ""}`);
  if (!response.ok) {
    throw new Error("Failed to fetch browse facets");
  }
  return response.json();
}
