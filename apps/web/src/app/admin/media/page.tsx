"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTenantAdmin, Resource, DateCell, MediaUploadInput, buildUrl } from "@/components/admin";
import { Download, Copy, Trash2, FileText, ExternalLink, FileAudio, FileVideo, File, Info, Edit2 } from "lucide-react";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { MediaEditAssociations } from "@/components/admin/media";

interface MediaRecord extends Record<string, unknown> {
  id: number;
  tenant_id: number;
  url: string;
  filename: string;
  metadata: Record<string, unknown>;
  created_at: string;
  tenants?: {
    id: number;
    name: string;
    domain: string;
  };
  media_page_associations?: Array<{
    id: number;
    media_id: number;
    page_id: number;
    usage_type: string;
    pages?: {
      id: number;
      title: string;
      slug: string;
    };
  }>;
}

function MediaDetailsPanel({ media }: { media: MediaRecord }) {
  const { tenantId } = useTenantAdmin();
  const isSuper = tenantId === null;
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [associations, setAssociations] = useState<Array<{
    id: number;
    page_id: number;
    usage_type: string;
    pages: { id: number; title: string; slug: string; tenants: { domain: string } | null } | null;
  }> | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      setLoadingUrl(true);
      try {
        const response = await fetch(`/api/admin/media/${media.id}/download`);
        if (response.ok) {
          const { url } = await response.json();
          setSignedUrl(url);
        }
      } catch (error) {
        console.error("Failed to fetch signed URL:", error);
      } finally {
        setLoadingUrl(false);
      }
    };

    const fetchAssociations = async () => {
      try {
        const res = await fetch(`/api/admin/media/${media.id}/associations`);
        if (res.ok) {
          setAssociations(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch associations:", error);
      }
    };

    fetchSignedUrl();
    fetchAssociations();
  }, [media.id]);

  const metadata = media.metadata as Record<string, unknown> || {};
  const type = metadata.type ? String(metadata.type) : "unknown";
  const size = metadata.size ? Number(metadata.size) : 0;

  const sizeStr =
    size >= 1024 * 1024
      ? `${(size / (1024 * 1024)).toFixed(1)} MB`
      : size >= 1024
        ? `${(size / 1024).toFixed(1)} KB`
        : `${size} bytes`;

  const copyStoragePath = () => {
    navigator.clipboard.writeText(media.url);
  };

  return (
    <div className="space-y-5">
      {/* Preview */}
      <div className="overflow-hidden rounded-lg border border-border bg-muted">
        {type === "image" && signedUrl ? (
          <img
            src={signedUrl}
            alt={media.filename}
            className="max-h-56 w-full object-contain"
          />
        ) : type === "video" && signedUrl ? (
          <video
            src={signedUrl}
            controls
            className="max-h-56 w-full"
            preload="metadata"
          />
        ) : type === "audio" && signedUrl ? (
          <div className="flex flex-col items-center gap-2 p-4">
            <FileAudio className="h-8 w-8 text-muted-foreground" />
            <audio src={signedUrl} controls className="w-full" preload="metadata" />
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
            {type === "video" ? <FileVideo className="h-8 w-8" /> : type === "audio" ? <FileAudio className="h-8 w-8" /> : type === "document" ? <FileText className="h-8 w-8" /> : <File className="h-8 w-8" />}
            <span className="text-sm capitalize">{type}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {signedUrl && (
        <a
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted transition-colors"
        >
          <Download className="h-4 w-4" />
          Download file
        </a>
      )}

      {/* File info */}
      <div className="divide-y divide-border rounded-lg border border-border">
        <div className="flex items-start gap-3 px-4 py-3">
          <span className="w-20 shrink-0 text-xs text-muted-foreground pt-0.5">Filename</span>
          <div className="flex min-w-0 flex-1 items-start gap-1">
            {signedUrl ? (
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="min-w-0 break-all text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {media.filename}
              </a>
            ) : (
              <span className="min-w-0 break-all text-xs font-medium">{media.filename}</span>
            )}
            <button
              onClick={copyStoragePath}
              title="Copy storage path"
              className="ml-1 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <span className="w-20 shrink-0 text-xs text-muted-foreground">Type</span>
          <span className="text-xs capitalize">{type}</span>
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <span className="w-20 shrink-0 text-xs text-muted-foreground">Size</span>
          <span className="text-xs">{sizeStr}</span>
        </div>

        {isSuper && media.tenants && (
          <div className="flex items-start gap-3 px-4 py-3">
            <span className="w-20 shrink-0 text-xs text-muted-foreground pt-0.5">Tenant</span>
            <div>
              <p className="text-xs font-medium">{media.tenants.name}</p>
              <p className="text-xs text-muted-foreground">{media.tenants.domain}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 px-4 py-3">
          <span className="w-20 shrink-0 text-xs text-muted-foreground">Uploaded</span>
          <span className="text-xs">{new Date(media.created_at).toLocaleString()}</span>
        </div>
      </div>

      {/* Page associations */}
      {editMode ? (
        <MediaEditAssociations
          mediaId={media.id}
          tenantId={media.tenant_id}
          isSuper={isSuper}
          onCancel={() => setEditMode(false)}
          onSave={() => {
            // Refresh associations after save
            fetch(`/api/admin/media/${media.id}/associations`)
              .then((res) => res.json())
              .then((data) => setAssociations(data))
              .catch((err) => console.error("Failed to refresh associations:", err));
          }}
        />
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">Used on Pages</h3>
            <Button
              onClick={() => setEditMode(true)}
              size="sm"
              variant="outline"
              className="h-6"
            >
              <Edit2 className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
          {associations === null ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : associations.length === 0 ? (
            <p className="text-xs text-muted-foreground">Not used on any pages.</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {associations.map((assoc) => {
                const page = assoc.pages;
                if (!page) return null;
                const domain = page.tenants?.domain;
                const href = domain
                  ? buildUrl(domain, `/${page.slug}`)
                  : `/${page.slug}`;
                const label = domain ? `${domain}/${page.slug}` : `/${page.slug}`;
                return (
                  <a
                    key={assoc.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-xs font-medium">{page.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{label}</span>
                    </span>
                    <Badge variant="secondary" className="shrink-0">
                      {assoc.usage_type}
                    </Badge>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MediaPage() {
  const router = useRouter();
  const { tenantId } = useTenantAdmin();
  const isSuper = tenantId === null;
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    setUploadError(null);
    setRefreshKey((k) => k + 1);
    // Refresh server component to pick up fresh cache
    router.refresh();
  };

  return (
    <div className="w-full space-y-6">
      {/* Upload Section */}
      <div className="w-full rounded border border-border bg-card p-4 sm:p-6">
        <h3 className="mb-4 text-sm font-semibold">Upload Media</h3>
        <MediaUploadInput
          onUploadComplete={handleUploadComplete}
          onError={setUploadError}
        />
        {uploadError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{uploadError}</p>
        )}
      </div>

      {/* Media Table */}
      <div className="w-full overflow-hidden">
        <Resource<MediaRecord>
        key={refreshKey}
        resource="media"
        title={isSuper ? "All Media" : "Media"}
        subtitle={isSuper ? "Manage media files across all tenants" : "Manage files for this site"}
        searchField="filename"
        searchPlaceholder="Search by filename…"
        canSort
        canRefresh
        select={isSuper 
          ? "*, tenants(id, name, domain), media_page_associations(id, media_id, page_id, usage_type, pages(id, title, slug))" 
          : "*, media_page_associations(id, media_id, page_id, usage_type, pages(id, title, slug))"
        }
        filters={isSuper ? undefined : [{ field: "tenant_id", operator: "eq", value: tenantId }]}
        onDeleteRow={async (row) => {
          const res = await fetch(`/api/media/${row.id}`, { method: "DELETE" });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error((body as { error?: string }).error ?? "Delete failed");
          }
        }}
        columns={
          isSuper
            ? [
                { key: "filename", label: "Filename" },
                {
                  key: "metadata_type",
                  label: "Type",
                  render: (value, row: Record<string, unknown>) => {
                    const metadata = row.metadata as Record<string, unknown> | undefined;
                    const type = metadata?.type ? String(metadata.type) : "unknown";
                    return <Badge variant="outline" className="capitalize">{type}</Badge>;
                  },
                },
                {
                  key: "metadata_size",
                  label: "Size",
                  render: (value, row: Record<string, unknown>) => {
                    const metadata = row.metadata as Record<string, unknown> | undefined;
                    if (!metadata?.size) return <span className="text-xs text-muted-foreground">—</span>;
                    const bytes = Number(metadata.size);
                    const mb = bytes / (1024 * 1024);
                    const sizeStr = mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
                    return <span className="text-xs text-muted-foreground whitespace-nowrap">{sizeStr}</span>;
                  },
                },
                {
                  key: "media_page_associations",
                  label: "Usage",
                  render: (value, row: Record<string, unknown>) => {
                    const associations = (row.media_page_associations as Array<any> | undefined) || [];
                    if (associations.length === 0) {
                      return <span className="text-xs text-muted-foreground">—</span>;
                    }
                    const usageType = String(associations[0]?.usage_type ?? "general");
                    const label = usageType.charAt(0).toUpperCase() + usageType.slice(1);
                    const extra = associations.length > 1 ? ` +${associations.length - 1}` : "";
                    return <span className="text-xs whitespace-nowrap">{label}{extra}</span>;
                  },
                },
                {
                  key: "tenants",
                  label: "Tenant",
                  render: (value, row: Record<string, unknown>) => {
                    const tenants = row.tenants as { name?: string } | undefined;
                    const tenantName = tenants?.name ? String(tenants.name) : "—";
                    return <span className="text-xs whitespace-nowrap">{tenantName}</span>;
                  },
                },
                { key: "created_at", label: "Uploaded", render: DateCell, sortable: true },
              ]
            : [
                { key: "filename", label: "Filename" },
                {
                  key: "metadata_type",
                  label: "Type",
                  render: (value, row: Record<string, unknown>) => {
                    const metadata = row.metadata as Record<string, unknown> | undefined;
                    const type = metadata?.type ? String(metadata.type) : "unknown";
                    return <Badge variant="outline" className="capitalize">{type}</Badge>;
                  },
                },
                {
                  key: "metadata_size",
                  label: "Size",
                  render: (value, row: Record<string, unknown>) => {
                    const metadata = row.metadata as Record<string, unknown> | undefined;
                    if (!metadata?.size) return <span className="text-xs text-muted-foreground">—</span>;
                    const bytes = Number(metadata.size);
                    const mb = bytes / (1024 * 1024);
                    const sizeStr = mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
                    return <span className="text-xs text-muted-foreground whitespace-nowrap">{sizeStr}</span>;
                  },
                },
                {
                  key: "media_page_associations",
                  label: "Usage",
                  render: (value, row: Record<string, unknown>) => {
                    const associations = (row.media_page_associations as Array<any> | undefined) || [];
                    if (associations.length === 0) {
                      return <span className="text-xs text-muted-foreground">—</span>;
                    }
                    const usageType = String(associations[0]?.usage_type ?? "general");
                    const label = usageType.charAt(0).toUpperCase() + usageType.slice(1);
                    const extra = associations.length > 1 ? ` +${associations.length - 1}` : "";
                    return <span className="text-xs whitespace-nowrap">{label}{extra}</span>;
                  },
                },
                { key: "created_at", label: "Uploaded", render: DateCell, sortable: true },
              ]
        }
        sidePanel={{
          icon: Info,
          title: "Media Details",
          view: (row) => <MediaDetailsPanel media={row as MediaRecord} />,
          width: "md",
        }}
      />
      </div>
    </div>
  );
}
