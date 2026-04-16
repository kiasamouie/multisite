"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/context/admin-context";
import { UploadInput } from "@/components/common";
import {
  useSupabaseList,
  type SupabaseFilter,
} from "@/hooks/useSupabase";
import {
  PageHeader,
  DataView,
} from "@/components/common";
import type { Column } from "@repo/ui/admin/components";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
  ExternalLink, Download, Copy,
  FileText, FileAudio, FileVideo, File,
} from "lucide-react";
import { toast } from "sonner";
import { buildTenantUrl } from "@/lib/url";

interface MediaRecord extends Record<string, unknown> {
  id: number;
  tenant_id: number;
  url: string;
  filename: string;
  metadata: Record<string, unknown>;
  created_at: string;
  tenants?: { id: number; name: string; domain: string };
  media_page_associations?: Array<{
    id: number;
    media_id: number;
    page_id: number;
    usage_type: string;
    pages?: { id: number; title: string; slug: string };
  }>;
}

function formatDate(v: unknown): string {
  if (!v) return "—";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
}

function formatSize(metadata: Record<string, unknown> | undefined): string {
  if (!metadata?.size) return "—";
  const bytes = Number(metadata.size);
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

type DetailAssoc = {
  id: number;
  page_id: number;
  usage_type: string;
  pages: { id: number; title: string; slug: string; tenants: { domain: string } | null } | null;
};

function MediaDetailsContent({ item: m }: { item: MediaRecord }) {
  const { tenantId } = useAdmin();
  const isSuper = tenantId === null;
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [detailAssociations, setDetailAssociations] = useState<DetailAssoc[] | null>(null);

  useEffect(() => {
    setSignedUrl(null);
    setDetailAssociations(null);
    fetch(`/api/admin/media/${m.id}/download`).then((r) => r.json()).then((d) => setSignedUrl(d.url ?? null)).catch(() => null);
    fetch(`/api/admin/media/${m.id}/associations`).then((r) => r.json()).then((d: DetailAssoc[]) => setDetailAssociations(d)).catch(() => null);
  }, [m.id]);

  const meta = (m.metadata as Record<string, unknown>) ?? {};
  const mtype = meta.type ? String(meta.type) : "unknown";
  const msize = meta.size ? Number(meta.size) : 0;
  const sizeStr = msize >= 1024 * 1024 ? `${(msize / (1024 * 1024)).toFixed(1)} MB` : msize >= 1024 ? `${(msize / 1024).toFixed(1)} KB` : `${msize} bytes`;

  return (
    <div className="space-y-5">
      {/* Preview */}
      <div className="overflow-hidden rounded-xl bg-black/80">
        {mtype === "image" && signedUrl ? (
          <img src={signedUrl} alt={m.filename} className="max-h-56 w-full object-contain" />
        ) : mtype === "video" && signedUrl ? (
          <video src={signedUrl} controls className="max-h-56 w-full" preload="metadata" />
        ) : mtype === "audio" && signedUrl ? (
          <div className="flex flex-col items-center gap-2 p-5">
            <FileAudio className="h-8 w-8 text-muted-foreground" />
            <audio src={signedUrl} controls className="w-full" preload="metadata" />
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
            {mtype === "video" ? <FileVideo className="h-8 w-8" /> : mtype === "audio" ? <FileAudio className="h-8 w-8" /> : mtype === "document" ? <FileText className="h-8 w-8" /> : <File className="h-8 w-8" />}
            <span className="text-sm capitalize">{mtype}</span>
          </div>
        )}
      </div>

      {/* Download */}
      {signedUrl && (
        <Button asChild size="sm" className="btn-kinetic w-full gap-2 font-medium">
          <a href={signedUrl} target="_blank" rel="noopener noreferrer" download><Download className="h-3.5 w-3.5" /> Download file</a>
        </Button>
      )}

      {/* File info */}
      <div className="divide-y divide-border/30 rounded-xl bg-muted/40">
        <div className="flex items-start gap-3 px-4 py-2.5">
          <span className="w-20 shrink-0 pt-0.5 text-xs text-muted-foreground">Filename</span>
          <div className="flex min-w-0 flex-1 items-start gap-1">
            {signedUrl ? (
              <a href={signedUrl} target="_blank" rel="noopener noreferrer" download className="min-w-0 break-all text-xs font-medium text-primary hover:underline">{m.filename}</a>
            ) : (
              <span className="min-w-0 break-all text-xs font-medium">{m.filename}</span>
            )}
            <button onClick={() => navigator.clipboard.writeText(m.url)} title="Copy storage path" className="ml-1 shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-20 shrink-0 text-xs text-muted-foreground">Type</span>
          <span className="text-xs capitalize">{mtype}</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-20 shrink-0 text-xs text-muted-foreground">Size</span>
          <span className="text-xs">{sizeStr}</span>
        </div>
        {isSuper && m.tenants && (
          <div className="flex items-start gap-3 px-4 py-2.5">
            <span className="w-20 shrink-0 pt-0.5 text-xs text-muted-foreground">Tenant</span>
            <div><p className="text-xs font-medium">{m.tenants.name}</p><p className="text-xs text-muted-foreground">{m.tenants.domain}</p></div>
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-20 shrink-0 text-xs text-muted-foreground">Uploaded</span>
          <span className="text-xs">{new Date(m.created_at).toLocaleString()}</span>
        </div>
      </div>

      {/* Page associations */}
      <div>
        <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Used on Pages</h3>
        {detailAssociations === null ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : detailAssociations.length === 0 ? (
          <p className="text-xs text-muted-foreground">Not used on any pages.</p>
        ) : (
          <div className="divide-y divide-border/30 rounded-xl border border-border/40">
            {detailAssociations.map((assoc) => {
              const page = assoc.pages;
              if (!page) return null;
              const domain = page.tenants?.domain;
              const href = domain ? buildTenantUrl(domain, `/${page.slug}`) : `/${page.slug}`;
              const label = domain ? `${domain}/${page.slug}` : `/${page.slug}`;
              return (
                <a key={assoc.id} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-xs font-medium">{page.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{label}</span>
                  </span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">{assoc.usage_type}</Badge>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MediaPage() {
  const router = useRouter();
  const { tenantId } = useAdmin();
  const isSuper = tenantId === null;

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filters = useMemo<SupabaseFilter[]>(() => {
    const f: SupabaseFilter[] = [];
    if (!isSuper) f.push({ field: "tenant_id", operator: "eq", value: tenantId });
    if (search.trim()) f.push({ field: "filename", operator: "contains", value: search });
    return f;
  }, [tenantId, isSuper, search]);

  const list = useSupabaseList<MediaRecord>({
    resource: "media",
    select: isSuper
      ? "*, tenants(id, name, domain), media_page_associations(id, media_id, page_id, usage_type, pages(id, title, slug))"
      : "*, media_page_associations(id, media_id, page_id, usage_type, pages(id, title, slug))",
    filters,
  });

  const handleUploadComplete = () => {
    setUploadError(null);
    list.invalidate();
    router.refresh();
    toast.success("Upload complete");
  };

  const handleDeleteItem = async (row: MediaRecord) => {
    try {
      const res = await fetch(`/api/media/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Delete failed");
      }
      toast.warning("Media deleted");
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const columns: Column<MediaRecord>[] = [
    { key: "filename", label: "Filename", sortable: true },
    {
      key: "metadata" as keyof MediaRecord & string,
      label: "Type",
      render: (row) => {
        const type = row.metadata?.type ? String(row.metadata.type) : "unknown";
        return <Badge variant="outline" className="capitalize">{type}</Badge>;
      },
    },
    {
      key: "url" as keyof MediaRecord & string,
      label: "Size",
      render: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatSize(row.metadata)}</span>
      ),
    },
    {
      key: "media_page_associations" as keyof MediaRecord & string,
      label: "Usage",
      render: (row) => {
        const assoc = row.media_page_associations ?? [];
        if (assoc.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
        const usageType = String(assoc[0]?.usage_type ?? "general");
        const label = usageType.charAt(0).toUpperCase() + usageType.slice(1);
        const extra = assoc.length > 1 ? ` +${assoc.length - 1}` : "";
        return <span className="text-xs whitespace-nowrap">{label}{extra}</span>;
      },
    },
    ...(isSuper
      ? [{
          key: "tenants" as keyof MediaRecord & string,
          label: "Tenant",
          render: (row: MediaRecord) => (
            <span className="text-xs whitespace-nowrap">{row.tenants?.name ?? "—"}</span>
          ),
        }]
      : []),
    {
      key: "created_at",
      label: "Uploaded",
      sortable: true,
      render: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.created_at)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageHeader title={isSuper ? "All Media" : "Media"} />

      {/* Upload section */}
      <div className="w-full rounded-xl border-0 bg-card/60 p-5 backdrop-blur-sm sm:p-6">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Upload Media
        </h3>
        <UploadInput
          onUploadComplete={handleUploadComplete}
          onError={setUploadError}
        />
        {uploadError && (
          <p className="mt-3 text-sm text-destructive">{uploadError}</p>
        )}
      </div>

      <DataView
        columns={columns}
        data={list.data}
        loading={list.isLoading}
        onRefresh={() => { list.invalidate(); toast.info("Refreshed", { duration: 1500 }); }}
        filter={{ search, onSearchChange: setSearch, searchPlaceholder: "Search by filename\u2026" }}
        mode="table"
        emptyMessage="No media files found."
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        viewHref={(row) => `/admin/media/${row.id}`}
        canView
        viewModal={{
          title: (row) => row.filename,
          content: (row) => <MediaDetailsContent item={row} />,
          size: "lg",
        }}
        canDelete
        deleteConfig={{
          onConfirm: handleDeleteItem,
          title: "Delete media?",
          description: "This will permanently delete the file and all page associations.",
        }}
      />
    </div>
  );
}
