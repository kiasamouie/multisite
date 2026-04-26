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
import { Download, Copy,
  FileText, FileAudio, FileVideo, File,
} from "lucide-react";
import { toast } from "sonner";

interface MediaRecord extends Record<string, unknown> {
  id: number;
  tenant_id: number;
  url: string;
  filename: string;
  metadata: Record<string, unknown>;
  created_at: string;
  tags?: string[];
  tenants?: { id: number; name: string; domain: string };
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

function MediaDetailsContent({ item: m }: { item: MediaRecord }) {
  const { tenantId } = useAdmin();
  const isSuper = tenantId === null;
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    setSignedUrl(null);
    fetch(`/api/admin/media/${m.id}/download`).then((r) => r.json()).then((d) => setSignedUrl(d.url ?? null)).catch(() => null);
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

      {/* Tags */}
      {(m.tags ?? []).length > 0 && (
        <div>
          <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {(m.tags ?? []).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MediaPage() {
  const router = useRouter();
  const { tenantId } = useAdmin();
  const isSuper = tenantId === null;

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const tenantList = useSupabaseList<{ id: number; name: string } & Record<string, unknown>>({
    resource: "tenants",
    select: "id, name",
    enabled: isSuper,
    pageSize: 200,
  });

  const filters = useMemo<SupabaseFilter[]>(() => {
    const f: SupabaseFilter[] = [];
    if (!isSuper) f.push({ field: "tenant_id", operator: "eq", value: tenantId });
    if (search.trim()) f.push({ field: "filename", operator: "contains", value: search });
    if (isSuper && tenantFilter) f.push({ field: "tenant_id", operator: "eq", value: Number(tenantFilter) });
    return f;
  }, [tenantId, isSuper, search, tenantFilter]);

  const list = useSupabaseList<MediaRecord>({
    resource: "media",
    select: isSuper
      ? "*, tenants(id, name, domain)"
      : "*",
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
      sortable: true,
      sortValue: (row) => row.metadata?.type ? String(row.metadata.type) : "unknown",
      render: (row) => {
        const type = row.metadata?.type ? String(row.metadata.type) : "unknown";
        const colorMap: Record<string, string> = {
          image:    "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
          video:    "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
          audio:    "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
          document: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        };
        return (
          <Badge variant="outline" className={`capitalize ${colorMap[type] ?? "border-border bg-muted text-muted-foreground"}`}>{type}</Badge>
        );
      },
    },
    {
      key: "tags" as keyof MediaRecord & string,
      label: "Tags",
      render: (row) => {
        const t = row.tags ?? [];
        if (t.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {t.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
            ))}
            {t.length > 3 && <span className="text-[10px] text-muted-foreground">+{t.length - 3}</span>}
          </div>
        );
      },
    },
    {
      key: "url" as keyof MediaRecord & string,
      label: "Size",
      sortable: true,
      sortValue: (row) => (row.metadata?.size ? Number(row.metadata.size) : 0),
      render: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatSize(row.metadata)}</span>
      ),
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
        data={list.data.filter((r) => {
          if (typeFilter && String(r.metadata?.type ?? "") !== typeFilter) return false;
          if (tagFilter && !(r.tags ?? []).includes(tagFilter)) return false;
          return true;
        })}
        loading={list.isLoading}
        onRefresh={list.invalidate}
        filter={{
          search,
          onSearchChange: setSearch,
          searchPlaceholder: "Search by filename…",
          filters: [
            ...( isSuper ? [{
              type: "combobox" as const,
              label: "Tenant",
              value: tenantFilter,
              onChange: setTenantFilter,
              options: tenantList.data.map(t => ({ value: String(t.id), label: String(t.name) })),
              placeholder: "All tenants",
              searchPlaceholder: "Search tenants…",
              width: "200px",
            }] : []),
            {
              type: "chips" as const,
              inline: true,
              value: typeFilter,
              onChange: setTypeFilter,
              options: [
                { value: "image",    label: "Image" },
                { value: "video",    label: "Video" },
                { value: "audio",    label: "Audio" },
                { value: "document", label: "Document" },
              ],
            },
            {
              type: "combobox" as const,
              label: "Tag",
              value: tagFilter,
              onChange: setTagFilter,
              options: Array.from(
                new Set(list.data.flatMap((r) => r.tags ?? []))
              ).sort().map((t) => ({ value: t, label: t })),
              placeholder: "All tags",
              searchPlaceholder: "Search tags…",
              width: "160px",
            },
          ],
          hasFilters: search !== "" || tenantFilter !== "" || typeFilter !== "" || tagFilter !== "",
          onClear: () => { setSearch(""); setTenantFilter(""); setTypeFilter(""); setTagFilter(""); },
        }}
        mode="table"
        emptyMessage="No media files found."
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        pageSize={list.pageSize}
        onPageSizeChange={(s) => { list.setPageSize(s); list.setPage(1); }}
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
