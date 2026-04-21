"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@repo/ui/input";
import { Button } from "@repo/ui/button";
import { X, ImageIcon, VideoIcon, Search } from "lucide-react";

interface MediaItem {
  id: number;
  filename: string;
  url: string;
  metadata: Record<string, unknown>;
}

interface MediaPickerFieldProps {
  value: number | null;
  onChange: (id: number | null) => void;
  tenantId: number;
  /** Filter media by type. Omit to show all media. */
  mediaType?: "image" | "video";
}

function isVideoFile(item: MediaItem): boolean {
  const mime = (item.metadata?.mime_type ?? item.metadata?.content_type ?? "") as string;
  if (mime) return mime.startsWith("video/");
  const ext = item.filename.split(".").pop()?.toLowerCase() ?? "";
  return ["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(ext);
}

/**
 * MediaPickerField — a visual grid picker for tenant media.
 * Used as a custom Puck field for any block that needs an image or video.
 *
 * Stores the media record ID (number). The permanent proxy
 * `/api/media/{id}/img` is used for display — URLs never expire.
 */
export function MediaPickerField({ value, onChange, tenantId, mediaType }: MediaPickerFieldProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ tenantId: String(tenantId) });
    if (mediaType) params.set("mediaType", mediaType);
    fetch(`/api/admin/media/picker?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setItems(data.items ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tenantId, mediaType]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((m) => m.filename.toLowerCase().includes(q));
  }, [items, search]);

  const selected = useMemo(
    () => items.find((m) => m.id === value) ?? null,
    [items, value]
  );

  const handleSelect = useCallback(
    (id: number) => onChange(id === value ? null : id),
    [onChange, value]
  );

  const EmptyIcon = mediaType === "video" ? VideoIcon : ImageIcon;
  const emptyLabel = mediaType === "video" ? "No videos" : mediaType === "image" ? "No images" : "No media";

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading media...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
        <EmptyIcon className="mx-auto mb-1 h-5 w-5 opacity-50" />
        {emptyLabel} uploaded yet. Upload files in the Media section first.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Selected preview */}
      {selected && (
        <div className="relative rounded-md border overflow-hidden">
          {isVideoFile(selected) ? (
            <div className="flex h-24 w-full items-center justify-center bg-muted">
              <VideoIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          ) : (
            <img
              src={selected.url}
              alt={selected.filename}
              className="h-24 w-full object-cover"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-xs text-white truncate">
            {selected.filename}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 bg-black/40 text-white hover:bg-black/60"
            onClick={() => onChange(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${mediaType ?? "media"}...`}
          className="h-7 pl-7 text-xs"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto rounded-md border p-1.5">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item.id)}
            className={`relative aspect-square overflow-hidden rounded border transition-all ${
              item.id === value
                ? "ring-2 ring-primary border-primary"
                : "border-border hover:border-primary/50"
            }`}
          >
            {isVideoFile(item) ? (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <VideoIcon className="h-5 w-5 text-muted-foreground" />
                <span className="absolute bottom-0.5 left-0.5 right-0.5 truncate text-[9px] text-muted-foreground">
                  {item.filename}
                </span>
              </div>
            ) : (
              <img
                src={item.url}
                alt={item.filename}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 py-3 text-center text-xs text-muted-foreground">
            No results for &ldquo;{search}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Factory that creates a stable Puck custom field render function
 * bound to a specific tenant. Used in puck config for image fields.
 */
export function createMediaPickerRender(tenantId: number, mediaType?: "image" | "video") {
  return function MediaPickerRender({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
    return (
      <MediaPickerField
        tenantId={tenantId}
        value={typeof value === "number" ? value : null}
        onChange={(id) => onChange(id)}
        mediaType={mediaType}
      />
    );
  };
}
