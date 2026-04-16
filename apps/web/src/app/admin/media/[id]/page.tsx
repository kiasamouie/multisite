"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@repo/lib/supabase/browser";
import { useAdmin } from "@/context/admin-context";
import { PageHeader, ReadOnlyField, DetailLayout, CrudModal } from "@/components/common";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Label } from "@repo/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select";
import { Skeleton } from "@repo/ui/skeleton";
import {
  Download,
  Copy,
  FileText,
  FileAudio,
  FileVideo,
  File,
  ExternalLink,
  ArrowLeft,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { buildTenantUrl } from "@/lib/url";

interface MediaRecord {
  id: number;
  tenant_id: number;
  url: string;
  filename: string;
  metadata: Record<string, unknown>;
  created_at: string;
  tenants?: { id: number; name: string; domain: string };
}

interface Association {
  id: number;
  page_id: number;
  usage_type: string;
  pages: {
    id: number;
    title: string;
    slug: string;
    tenants: { domain: string } | null;
  } | null;
}

export default function MediaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { tenantId } = useAdmin();
  const isSuper = tenantId === null;
  const mediaId = Number(params.id);

  const [media, setMedia] = useState<MediaRecord | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [editAssoc, setEditAssoc] = useState(false);

  /* ── Edit-associations modal state ─────────────────────── */
  const [assocPages, setAssocPages] = useState<Array<{ id: number; title: string; slug: string }>>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [modalAssociations, setModalAssociations] = useState<Association[]>([]);
  const [loadingModalAssoc, setLoadingModalAssoc] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [addingAssoc, setAddingAssoc] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Array<{ id: number; name: string; domain: string }>>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<number>(0);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const select = isSuper
        ? "*, tenants(id, name, domain)"
        : "*";
      const { data, error } = await (supabase as any)
        .from("media")
        .select(select)
        .eq("id", mediaId)
        .single();
      if (error || !data) throw new Error("Not found");
      setMedia(data);
    } catch {
      setMedia(null);
    } finally {
      setLoading(false);
    }
  }, [mediaId, isSuper]);

  const fetchSignedUrl = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/media/${mediaId}/download`);
      const data = await res.json();
      setSignedUrl(data.url ?? null);
    } catch {
      /* ignore */
    }
  }, [mediaId]);

  const fetchAssociations = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/media/${mediaId}/associations`);
      const data = await res.json();
      setAssociations(Array.isArray(data) ? data : []);
    } catch {
      setAssociations([]);
    }
  }, [mediaId]);

  useEffect(() => {
    fetchMedia();
    fetchSignedUrl();
    fetchAssociations();
  }, [fetchMedia, fetchSignedUrl, fetchAssociations]);

  /* ── Load modal data when edit opens ───────────────────── */
  useEffect(() => {
    if (!editAssoc || !media) return;
    setSelectedTenantId(media.tenant_id);
    // Load tenants for super admin
    if (isSuper) {
      setLoadingTenants(true);
      fetch("/api/admin/tenants?perPage=100").then((r) => r.json()).then((d) => setTenants(d.tenants || [])).catch(() => {}).finally(() => setLoadingTenants(false));
    }
    // Load associations
    setLoadingModalAssoc(true);
    fetch(`/api/admin/media/${media.id}/associations`).then((r) => r.json()).then((d) => setModalAssociations(Array.isArray(d) ? d : [])).catch(() => setModalAssociations([])).finally(() => setLoadingModalAssoc(false));
  }, [editAssoc, media, isSuper]);

  // Load pages when selected tenant changes
  useEffect(() => {
    if (!editAssoc || !selectedTenantId) return;
    setLoadingPages(true);
    fetch(`/api/admin/pages?tenantId=${selectedTenantId}&fields=id,title,slug`).then((r) => r.json()).then((d) => setAssocPages(d.pages || [])).catch(() => setAssocPages([])).finally(() => setLoadingPages(false));
  }, [editAssoc, selectedTenantId]);

  const existingPageIds = new Set(modalAssociations.map((a) => a.page_id));
  const availablePages = assocPages.filter((p) => !existingPageIds.has(p.id));

  const handleAddAssoc = async () => {
    if (!selectedPageId || !media) return;
    setAddingAssoc(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/admin/media/${media.id}/associations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page_id: selectedPageId, usage_type: "pages" }) });
      if (!res.ok) { const e = await res.json(); setAddError(e.error || "Failed"); return; }
      const newA = await res.json();
      setModalAssociations((prev) => [...prev, newA]);
      setSelectedPageId(null);
      toast.success("Association added");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast.error(msg);
      setAddError(msg);
    } finally { setAddingAssoc(false); }
  };

  const handleRemoveAssoc = async (assocId: number, pageId: number) => {
    if (!media) return;
    setRemovingId(assocId);
    setRemoveError(null);
    try {
      const res = await fetch(`/api/admin/media/${media.id}/associations`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page_id: pageId }) });
      if (!res.ok) { const e = await res.json(); setRemoveError(e.error || "Failed"); return; }
      setModalAssociations((prev) => prev.filter((a) => a.id !== assocId));
      toast.success("Association removed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast.error(msg);
      setRemoveError(msg);
    } finally { setRemovingId(null); }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!media) {
    return (
      <div className="flex flex-col gap-6 py-2">
        <PageHeader
          title="Media Not Found"
          actions={
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/media")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          }
        />
      </div>
    );
  }

  const metadata = media.metadata || {};
  const type = metadata.type ? String(metadata.type) : "unknown";
  const size = metadata.size ? Number(metadata.size) : 0;
  const sizeStr =
    size >= 1024 * 1024
      ? `${(size / (1024 * 1024)).toFixed(1)} MB`
      : size >= 1024
        ? `${(size / 1024).toFixed(1)} KB`
        : `${size} bytes`;

  const copyPath = () => navigator.clipboard.writeText(media.url);

  const preview = (
    <div className="overflow-hidden rounded-xl bg-black/80">
      {type === "image" && signedUrl ? (
        <img src={signedUrl} alt={media.filename} className="max-h-80 w-full object-contain" />
      ) : type === "video" && signedUrl ? (
        <video src={signedUrl} controls className="max-h-80 w-full" preload="metadata" />
      ) : type === "audio" && signedUrl ? (
        <div className="flex flex-col items-center gap-2 p-5">
          <FileAudio className="h-8 w-8 text-muted-foreground" />
          <audio src={signedUrl} controls className="w-full" preload="metadata" />
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
          {type === "video" ? <FileVideo className="h-8 w-8" /> : type === "document" ? <FileText className="h-8 w-8" /> : <File className="h-8 w-8" />}
          <span className="text-sm capitalize">{type}</span>
        </div>
      )}
    </div>
  );

  const main = (
    <div className="space-y-6">
      {preview}

      {signedUrl && (
        <Button asChild size="sm" className="btn-kinetic w-full gap-2 font-medium">
          <a href={signedUrl} target="_blank" rel="noopener noreferrer" download>
            <Download className="h-3.5 w-3.5" /> Download file
          </a>
        </Button>
      )}

      {/* Page Associations */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Used on Pages
          </h3>
          <Button onClick={() => setEditAssoc(true)} size="sm" variant="ghost" className="h-6 gap-1 text-xs">
            Edit
          </Button>
        </div>
        {associations.length === 0 ? (
          <p className="text-xs text-muted-foreground">Not used on any pages.</p>
        ) : (
          <div className="divide-y divide-border/30 rounded-xl border border-border/40">
            {associations.map((assoc) => {
              const page = assoc.pages;
              if (!page) return null;
              const domain = page.tenants?.domain;
              const href = domain ? buildTenantUrl(domain, `/${page.slug}`) : `/${page.slug}`;
              return (
                <a
                  key={assoc.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-xs font-medium">{page.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {domain ? `${domain}/${page.slug}` : `/${page.slug}`}
                    </span>
                  </span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">{assoc.usage_type}</Badge>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Associations Modal */}
      <CrudModal
        open={editAssoc}
        onOpenChange={(open) => { if (!open) { setEditAssoc(false); fetchAssociations(); } }}
        mode="edit"
        title="Manage Page Associations"
        size="lg"
      >
        <div className="space-y-5">
          <p className="text-xs text-muted-foreground">
            Add or remove pages where this media is used.{isSuper ? " As platform admin, you can associate this media to pages across any tenant." : ""}
          </p>

          {/* Tenant selector (super admin) */}
          {isSuper && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <Label className="text-xs font-semibold mb-3 block">Target Tenant</Label>
              {loadingTenants ? (
                <p className="text-xs text-muted-foreground">Loading tenants…</p>
              ) : (
                <Select value={String(selectedTenantId)} onValueChange={(v) => { setSelectedTenantId(Number(v)); setSelectedPageId(null); }} disabled={addingAssoc}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="— Select a tenant —" /></SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name} ({t.domain})</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <p className="mt-1.5 text-xs text-muted-foreground">Pages below are loaded from the selected tenant.</p>
            </div>
          )}

          {/* Current associations */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">Current Associations</Label>
            {loadingModalAssoc ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : modalAssociations.length === 0 ? (
              <p className="text-xs text-muted-foreground">Not used on any pages yet.</p>
            ) : (
              <div className="space-y-2">
                {modalAssociations.map((assoc) => (
                  <div key={assoc.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/50 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{assoc.pages?.title || "Unknown Page"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {assoc.pages?.tenants?.domain ? `${assoc.pages.tenants.domain}/${assoc.pages.slug || ""}` : `/${assoc.pages?.slug || "unknown"}`}
                      </p>
                    </div>
                    <button onClick={() => handleRemoveAssoc(assoc.id, assoc.page_id)} disabled={removingId === assoc.id} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 transition-colors" title="Remove">
                      {removingId === assoc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    </button>
                  </div>
                ))}
                {removeError && <p className="text-xs text-red-600 dark:text-red-400">{removeError}</p>}
              </div>
            )}
          </div>

          {/* Add page */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <Label className="text-xs font-semibold mb-3 block">Add Page</Label>
            <div className="space-y-3">
              {loadingPages ? (
                <p className="text-xs text-muted-foreground">Loading pages…</p>
              ) : availablePages.length === 0 ? (
                <p className="text-xs text-muted-foreground">{assocPages.length === 0 ? "No pages available." : "Already used on all pages."}</p>
              ) : (
                <Select value={selectedPageId != null ? String(selectedPageId) : ""} onValueChange={(v) => setSelectedPageId(v ? Number(v) : null)} disabled={addingAssoc}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="— Select a page —" /></SelectTrigger>
                  <SelectContent>
                    {availablePages.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.title} (/{p.slug})</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {selectedPageId && availablePages.length > 0 && (
                <Button onClick={handleAddAssoc} disabled={addingAssoc || !selectedPageId} size="sm" className="w-full">
                  {addingAssoc ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding…</> : "Add Association"}
                </Button>
              )}
              {addError && <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>}
            </div>
          </div>
        </div>
      </CrudModal>
    </div>
  );

  const sidebar = (
    <div className="divide-y divide-border/30 rounded-xl bg-muted/40">
      <ReadOnlyField label="Filename">
        <div className="flex items-center gap-1">
          <span className="break-all text-xs font-medium">{media.filename}</span>
          <button onClick={copyPath} title="Copy path" className="ml-1 shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </ReadOnlyField>
      <ReadOnlyField label="Type" value={type} />
      <ReadOnlyField label="Size" value={sizeStr} />
      {isSuper && media.tenants && (
        <ReadOnlyField label="Tenant">
          <p className="text-xs font-medium">{media.tenants.name}</p>
          <p className="text-xs text-muted-foreground">{media.tenants.domain}</p>
        </ReadOnlyField>
      )}
      <ReadOnlyField label="Uploaded" value={new Date(media.created_at).toLocaleString()} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageHeader
        title={media.filename}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/media")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Media
          </Button>
        }
      />
      <DetailLayout main={main} sidebar={sidebar} />
    </div>
  );
}
