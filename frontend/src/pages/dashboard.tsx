import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, FileText, FolderSearch, Link2, Search, UploadCloud } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  browseDocuments,
  fetchAllDocuments,
  fetchBrowseFacets,
  fetchTriageDocuments,
  ingestDocumentWithMetadata,
  linkDocument,
  searchDocuments,
  type BrowseFacets,
  type BrowseFilters,
  type DocumentItem,
} from "@/lib/api";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [triageDocuments, setTriageDocuments] = useState<DocumentItem[]>([]);
  const [searchResults, setSearchResults] = useState<DocumentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [linkMap, setLinkMap] = useState<Record<number, string>>({});
  const [busyLinkId, setBusyLinkId] = useState<number | null>(null);
  const [browseFilters, setBrowseFilters] = useState<BrowseFilters>({});
  const [browseResults, setBrowseResults] = useState<DocumentItem[]>([]);
  const [browseFacets, setBrowseFacets] = useState<BrowseFacets>({
    departments: [],
    years: [],
    types: [],
    suppliers: [],
  });

  const linkedCount = useMemo(() => documents.filter((d) => d.status === "linked").length, [documents]);

  async function refresh() {
    const [all, triage] = await Promise.all([fetchAllDocuments(), fetchTriageDocuments()]);
    setDocuments(all);
    setTriageDocuments(triage);
  }

  async function refreshBrowse(filters: BrowseFilters = browseFilters) {
    const [items, facets] = await Promise.all([browseDocuments(filters), fetchBrowseFacets(filters)]);
    setBrowseResults(items);
    setBrowseFacets(facets);
  }

  useEffect(() => {
    Promise.all([refresh(), refreshBrowse()]).catch(() => undefined);
    const interval = setInterval(() => {
      refresh().catch(() => undefined);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("pdf") as HTMLInputElement | null;
    const departmentInput = form.elements.namedItem("department") as HTMLInputElement | null;
    const yearInput = form.elements.namedItem("document_year") as HTMLInputElement | null;
    const typeInput = form.elements.namedItem("document_type") as HTMLInputElement | null;
    const supplierInput = form.elements.namedItem("supplier") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const yearValue = Number(yearInput?.value ?? "");
      await ingestDocumentWithMetadata(file, {
        department: departmentInput?.value.trim() || undefined,
        year: Number.isNaN(yearValue) ? undefined : yearValue,
        type: typeInput?.value.trim() || undefined,
        supplier: supplierInput?.value.trim() || undefined,
      });
      form.reset();
      await refresh();
      await refreshBrowse();
    } finally {
      setUploading(false);
    }
  }

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const items = await searchDocuments(query.trim());
      setSearchResults(items);
    } finally {
      setSearching(false);
    }
  }

  async function onLink(documentId: number) {
    const reference = linkMap[documentId]?.trim();
    if (!reference) return;

    setBusyLinkId(documentId);
    try {
      await linkDocument(documentId, reference);
      setLinkMap((prev) => ({ ...prev, [documentId]: "" }));
      await refresh();
      await refreshBrowse();
    } finally {
      setBusyLinkId(null);
    }
  }

  async function onBrowse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBrowseLoading(true);
    try {
      await refreshBrowse();
    } finally {
      setBrowseLoading(false);
    }
  }

  async function clearBrowseFilters() {
    const cleared: BrowseFilters = {};
    setBrowseFilters(cleared);
    setBrowseLoading(true);
    try {
      await refreshBrowse(cleared);
    } finally {
      setBrowseLoading(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl animate-fade-up p-4 md:p-8">
      {/* ── Brand Header ───────────────────────────────────────────────────── */}
      <header className="mb-6 flex items-center justify-between rounded-xl border border-primary/20 bg-card/90 px-5 py-4 shadow-lg shadow-black/30 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <img
            src="/vault-logo.png"
            alt="VAULT"
            className="h-14 w-auto drop-shadow-[0_0_14px_rgba(43,141,214,0.55)]"
          />
          <div className="hidden md:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Operations Console
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground/60">
              Ingestion&nbsp;&middot;&nbsp;Triage&nbsp;&middot;&nbsp;Search&nbsp;&middot;&nbsp;Browse
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-green-400/25 bg-green-400/10 px-3 py-1.5">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-green-400 shadow-[0_0_6px_2px_rgba(74,222,128,0.5)]" />
          <span className="text-xs font-medium text-green-400">Live</span>
        </div>
      </header>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <section className="mb-6 grid gap-3 md:grid-cols-3">
        <Card className="border-primary/15 bg-card/70">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Total Documents</CardDescription>
              <span className="rounded-md bg-primary/15 p-1.5 text-primary">
                <FileText className="size-4" />
              </span>
            </div>
            <CardTitle className="text-4xl font-bold tracking-tight text-foreground">
              {documents.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-emerald-500/15 bg-card/70">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Linked</CardDescription>
              <span className="rounded-md bg-emerald-500/15 p-1.5 text-emerald-400">
                <Link2 className="size-4" />
              </span>
            </div>
            <CardTitle className="text-4xl font-bold tracking-tight text-foreground">
              {linkedCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-amber-500/15 bg-card/70">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Awaiting Review</CardDescription>
              <span className="rounded-md bg-amber-500/15 p-1.5 text-amber-400">
                <AlertCircle className="size-4" />
              </span>
            </div>
            <CardTitle className="text-4xl font-bold tracking-tight text-foreground">
              {triageDocuments.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Tabs defaultValue="ingest" className="w-full">
        <TabsList className="grid w-full grid-cols-4 border border-border/50 bg-card/80">
          <TabsTrigger value="ingest" className="gap-1.5">
            <UploadCloud className="size-3.5" /> Ingest
          </TabsTrigger>
          <TabsTrigger value="triage" className="gap-1.5">
            <AlertCircle className="size-3.5" /> Triage Queue
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-1.5">
            <Search className="size-3.5" /> Search
          </TabsTrigger>
          <TabsTrigger value="browse" className="gap-1.5">
            <FolderSearch className="size-3.5" /> Browse
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingest">
          <Card className="border-primary/15">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/15 p-1.5 text-primary">
                  <UploadCloud className="size-4" />
                </span>
                <div>
                  <CardTitle>Upload Scan</CardTitle>
                  <CardDescription className="mt-0.5">Drop a PDF to enqueue OCR and Smart Regex linking.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-3 md:flex-row" onSubmit={onUpload}>
                <Input name="pdf" type="file" accept="application/pdf" required />
                <Input name="department" placeholder="Department" />
                <Input name="document_year" placeholder="Year" inputMode="numeric" />
                <Input name="document_type" placeholder="Document Type" />
                <Input name="supplier" placeholder="Supplier" />
                <Button type="submit" disabled={uploading}>
                  <UploadCloud className="size-4" />
                  {uploading ? "Uploading..." : "Ingest Document"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Latest Documents</CardTitle>
              <CardDescription>Live status of all processed records. Auto-refreshes every 7 s.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Filename</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Extracted Ref</TableHead>
                    <TableHead>Linked Ref</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.original_filename}</TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell>{item.department ?? "-"}</TableCell>
                      <TableCell>{item.document_type ?? "-"}</TableCell>
                      <TableCell>{item.supplier ?? "-"}</TableCell>
                      <TableCell>{item.document_year ?? "-"}</TableCell>
                      <TableCell>{item.extracted_reference ?? "-"}</TableCell>
                      <TableCell>{item.linked_reference ?? "-"}</TableCell>
                      <TableCell>{formatDate(item.updated_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="triage">
          <Card className="border-amber-500/15">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-500/15 p-1.5 text-amber-400">
                  <AlertCircle className="size-4" />
                </span>
                <div>
                  <CardTitle>Manual Triage</CardTitle>
                  <CardDescription className="mt-0.5">Link unresolved scans to the correct reference number.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {triageDocuments.length === 0 && (
                <p className="rounded-lg border border-border/50 bg-muted/30 py-6 text-center text-sm text-muted-foreground">
                  ✓ Queue is clear — no documents awaiting review.
                </p>
              )}

              {triageDocuments.map((item) => (
                <div key={item.id} className="rounded-lg border border-amber-500/15 bg-card/60 p-4 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{item.original_filename}</p>
                      <p className="text-sm text-muted-foreground">Document #{item.id}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <Separator className="my-3" />

                  <div className="flex flex-col gap-2 md:flex-row">
                    <Input
                      placeholder="PO-12345"
                      value={linkMap[item.id] ?? ""}
                      onChange={(e) => setLinkMap((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    />
                    <Button disabled={busyLinkId === item.id} onClick={() => onLink(item.id)}>
                      {busyLinkId === item.id ? "Linking..." : "Link Document"}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search">
          <Card className="border-primary/15">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/15 p-1.5 text-primary">
                  <Search className="size-4" />
                </span>
                <div>
                  <CardTitle>Audit Search</CardTitle>
                  <CardDescription className="mt-0.5">Query OCR text and linked references across archived scans.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="flex gap-2" onSubmit={onSearch}>
                <Input placeholder="Vendor, line item, PO number..." value={query} onChange={(e) => setQuery(e.target.value)} />
                <Button type="submit" disabled={searching}>
                  <Search className="size-4" />
                  {searching ? "Searching..." : "Search"}
                </Button>
              </form>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Filename</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.original_filename}</TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell>{item.linked_reference ?? item.extracted_reference ?? "-"}</TableCell>
                      <TableCell>{formatDate(item.updated_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="browse">
          <Card className="border-primary/15">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/15 p-1.5 text-primary">
                  <FolderSearch className="size-4" />
                </span>
                <div>
                  <CardTitle>Metadata Browse</CardTitle>
                  <CardDescription className="mt-0.5">
                    Drill down by department, year, type, and supplier to retrieve uploads without relying on OCR keywords.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="grid gap-2 md:grid-cols-6" onSubmit={onBrowse}>
                <Input
                  list="department-options"
                  placeholder="Department"
                  value={browseFilters.department ?? ""}
                  onChange={(e) => setBrowseFilters((prev) => ({ ...prev, department: e.target.value || undefined }))}
                />
                <datalist id="department-options">
                  {browseFacets.departments.map((facet) => (
                    <option key={facet.value} value={facet.value}>{`${facet.value} (${facet.count})`}</option>
                  ))}
                </datalist>

                <Input
                  list="year-options"
                  placeholder="Year"
                  value={browseFilters.year ?? ""}
                  onChange={(e) => {
                    const parsed = Number(e.target.value);
                    setBrowseFilters((prev) => ({ ...prev, year: Number.isNaN(parsed) ? undefined : parsed }));
                  }}
                />
                <datalist id="year-options">
                  {browseFacets.years.map((facet) => (
                    <option key={facet.value} value={facet.value}>{`${facet.value} (${facet.count})`}</option>
                  ))}
                </datalist>

                <Input
                  list="type-options"
                  placeholder="Type"
                  value={browseFilters.type ?? ""}
                  onChange={(e) => setBrowseFilters((prev) => ({ ...prev, type: e.target.value || undefined }))}
                />
                <datalist id="type-options">
                  {browseFacets.types.map((facet) => (
                    <option key={facet.value} value={facet.value}>{`${facet.value} (${facet.count})`}</option>
                  ))}
                </datalist>

                <Input
                  list="supplier-options"
                  placeholder="Supplier"
                  value={browseFilters.supplier ?? ""}
                  onChange={(e) => setBrowseFilters((prev) => ({ ...prev, supplier: e.target.value || undefined }))}
                />
                <datalist id="supplier-options">
                  {browseFacets.suppliers.map((facet) => (
                    <option key={facet.value} value={facet.value}>{`${facet.value} (${facet.count})`}</option>
                  ))}
                </datalist>

                <Input
                  placeholder="Optional text contains..."
                  value={browseFilters.q ?? ""}
                  onChange={(e) => setBrowseFilters((prev) => ({ ...prev, q: e.target.value || undefined }))}
                />

                <div className="flex gap-2">
                  <Button type="submit" disabled={browseLoading}>
                    {browseLoading ? "Loading..." : "Apply"}
                  </Button>
                  <Button type="button" variant="outline" onClick={clearBrowseFilters}>
                    Clear
                  </Button>
                </div>
              </form>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Filename</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {browseResults.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.original_filename}</TableCell>
                      <TableCell>{item.department ?? "-"}</TableCell>
                      <TableCell>{item.document_year ?? "-"}</TableCell>
                      <TableCell>{item.document_type ?? "-"}</TableCell>
                      <TableCell>{item.supplier ?? "-"}</TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell>{formatDate(item.updated_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
