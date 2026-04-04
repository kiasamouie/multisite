"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTenantAdmin, Resource, DateCell, MediaUploadInput, buildUrl } from "@/components/admin";

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
            <span className="material-symbols-outlined text-3xl text-muted-foreground">audio_file</span>
            <audio src={signedUrl} controls className="w-full" preload="metadata" />
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
            <span className="material-symbols-outlined text-3xl">
              {type === "video" ? "videocam" : type === "audio" ? "audio_file" : type === "document" ? "description" : "insert_drive_file"}
            </span>
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
          <span className="material-symbols-outlined text-[16px]">download</span>
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
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
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
      <div>
        <h3 className="mb-2 text-xs font-semibold text-foreground">Used on Pages</h3>
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
                  <span className="material-symbols-outlined text-[16px] shrink-0 text-muted-foreground">article</span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-xs font-medium">{page.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{label}</span>
                  </span>
                  <span className="material-symbols-outlined text-[14px] shrink-0 text-muted-foreground">open_in_new</span>
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
                    const typeColor: Record<string, string> = {
                      image: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                      video: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
                      audio: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                      document: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
                      unknown: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
                    };
                    return (
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap ${typeColor[type] || typeColor.unknown}`}>
                        {type}
                      </span>
                    );
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
                    const typeColor: Record<string, string> = {
                      image: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                      video: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
                      audio: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                      document: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
                      unknown: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
                    };
                    return (
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap ${typeColor[type] || typeColor.unknown}`}>
                        {type}
                      </span>
                    );
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
          icon: "info",
          title: "Media Details",
          view: (row) => <MediaDetailsPanel media={row as MediaRecord} />,
          width: "md",
        }}
      />
      </div>
    </div>
  );
}
