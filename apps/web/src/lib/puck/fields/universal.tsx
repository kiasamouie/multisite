"use client";

/**
 * Puck field factories — all produce Puck-compatible `render` functions
 * backed by the single `UniversalPicker` component from @repo/ui.
 *
 * Each factory maps a block-specific field (media, content library,
 * link, emoji, date, address) into a `UniversalPicker` configuration.
 *
 * There is no field-specific UI here: everything is parameterised.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { UniversalPicker, getCached } from "@repo/ui/universal-picker";
import type {
  PickerItem,
  PickerSource,
  PickerTab,
} from "@repo/ui/universal-picker";
import { VideoThumbnail } from "@repo/ui/video-thumbnail";
import { ImageIcon } from "lucide-react";

// ── Puck render signature ────────────────────────────────────────────────

type PuckRenderProps = {
  value: unknown;
  onChange: (v: unknown) => void;
};

type PuckRender = (props: PuckRenderProps) => React.ReactNode;

// ── Shared helpers ───────────────────────────────────────────────────────

interface MediaApiItem {
  id: number;
  filename: string;
  url: string;
  metadata: Record<string, unknown>;
}

function isVideoItem(item: MediaApiItem): boolean {
  const mime = (item.metadata?.mime_type ?? item.metadata?.content_type ?? "") as string;
  if (mime) return mime.startsWith("video/");
  const ext = item.filename.split(".").pop()?.toLowerCase() ?? "";
  return ["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(ext);
}

function mediaToPickerItem(item: MediaApiItem): PickerItem {
  const isVideo = isVideoItem(item);
  return {
    id: item.id,
    label: item.filename,
    imageUrl: isVideo ? undefined : item.url,
    videoUrl: isVideo ? item.url : undefined,
    meta: { isVideo, url: item.url },
  };
}

async function fetchMediaItems(
  tenantId: number,
  mediaType?: "image" | "video"
): Promise<PickerItem[]> {
  const params = new URLSearchParams({ tenantId: String(tenantId) });
  if (mediaType) params.set("mediaType", mediaType);
  const res = await fetch(`/api/admin/media/picker?${params}`);
  const data = (await res.json()) as { items?: MediaApiItem[] };
  return (data.items ?? []).map(mediaToPickerItem);
}

async function fetchContentItems(
  tenantId: number,
  contentType: string,
  displayField: string
): Promise<PickerItem[]> {
  const res = await fetch(`/api/admin/content/${contentType}?tenantId=${tenantId}`);
  const data = (await res.json()) as {
    items?: Array<Record<string, unknown>>;
  };
  return (data.items ?? []).map((r) => {
    const id = r.id as number;
    const label = String(
      r[displayField] ?? r.name ?? r.title ?? `#${id}`
    );
    const subtitle = (r.role ?? r.subtitle ?? r.email ?? "") as string;
    return {
      id,
      label,
      subtitle: subtitle || undefined,
      meta: r,
    };
  });
}

interface PageApiItem {
  id: number;
  title: string;
  slug: string;
}

async function fetchPageItems(tenantId: number): Promise<PickerItem[]> {
  const res = await fetch(`/api/admin/content/pages?tenantId=${tenantId}`);
  const data = (await res.json()) as { items?: PageApiItem[] };
  return (data.items ?? []).map((p) => ({
    id: `/${p.slug}`,
    label: p.title,
    subtitle: `/${p.slug}`,
    meta: { pageId: p.id },
  }));
}

async function searchAddresses(query: string): Promise<PickerItem[]> {
  const res = await fetch(`/api/proxy/osm/search?q=${encodeURIComponent(query)}`);
  const data = (await res.json()) as { items?: PickerItem[] };
  return data.items ?? [];
}

// ── Renderers ────────────────────────────────────────────────────────────

function renderMediaGridItem(item: PickerItem, _selected: boolean) {
  if (item.videoUrl) {
    return <VideoThumbnail src={item.videoUrl} alt={item.label} />;
  }
  if (item.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.imageUrl}
        alt={item.label}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <ImageIcon className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}

function renderMediaPreview(item: PickerItem) {
  return (
    <div className="relative overflow-hidden rounded-md border">
      <div className="h-24 w-full">
        {item.videoUrl ? (
          <VideoThumbnail src={item.videoUrl} alt={item.label} />
        ) : item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.label}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="truncate bg-black/60 px-2 py-1 text-xs text-white">
        {item.label}
      </div>
    </div>
  );
}

// ── Factories ────────────────────────────────────────────────────────────

/**
 * Media picker — single image or video selection from tenant library.
 *
 * - `storeAs: "id"` (default) → value is a number (media.id).
 * - `storeAs: "url"`           → value is a string URL (`/api/media/{id}/img`),
 *   useful for array sub-fields that historically stored a URL.
 */
export function createMediaPickerRender(
  tenantId: number,
  mediaType?: "image" | "video",
  options: { storeAs?: "id" | "url" } = {}
): PuckRender {
  const storeAs = options.storeAs ?? "id";
  const cacheKey = `media:${tenantId}:${mediaType ?? "all"}`;
  const source: PickerSource = {
    kind: "fetch",
    fetchItems: () => fetchMediaItems(tenantId, mediaType),
  };

  return function MediaPickerRender({ value, onChange }) {
    if (storeAs === "url") {
      // Derive the currently-selected media id from the URL (if any).
      const urlValue = typeof value === "string" ? value : "";
      const match = urlValue.match(/\/api\/media\/(\d+)\/img/);
      const currentId = match ? Number(match[1]) : null;
      return (
        <UniversalPicker
          source={source}
          mode="single"
          layout="grid"
          value={currentId}
          onChange={(v) =>
            onChange(typeof v === "number" ? `/api/media/${v}/img` : "")
          }
          renderGridItem={renderMediaGridItem}
          renderPreview={renderMediaPreview}
          emptyMessage="No media uploaded yet"
          cacheKey={cacheKey}
        />
      );
    }

    return (
      <UniversalPicker
        source={source}
        mode="single"
        layout="grid"
        value={typeof value === "number" ? value : null}
        onChange={(v) => onChange(typeof v === "number" ? v : null)}
        renderGridItem={renderMediaGridItem}
        renderPreview={renderMediaPreview}
        emptyMessage={
          mediaType === "video"
            ? "No videos uploaded yet"
            : mediaType === "image"
              ? "No images uploaded yet"
              : "No media uploaded yet"
        }
        cacheKey={cacheKey}
      />
    );
  };
}

/**
 * Gallery / multi-media picker — select multiple images.
 * Value is number[].
 */
export function createGalleryPickerRender(
  tenantId: number,
  mediaType: "image" | "video" | undefined = "image"
): PuckRender {
  const cacheKey = `media:${tenantId}:${mediaType ?? "all"}`;
  const source: PickerSource = {
    kind: "fetch",
    fetchItems: () => fetchMediaItems(tenantId, mediaType),
  };

  return function GalleryPickerRender({ value, onChange }) {
    const arr = Array.isArray(value) ? (value as number[]) : [];
    return (
      <UniversalPicker
        source={source}
        mode="multi"
        layout="grid"
        value={arr}
        onChange={(v) => onChange(Array.isArray(v) ? v : [])}
        renderGridItem={renderMediaGridItem}
        emptyMessage="No media uploaded yet"
        cacheKey={cacheKey}
      />
    );
  };
}

/**
 * Content library picker — multi-select team members / testimonials / events etc.
 * Value is number[].
 */
export function createContentPickerRender(
  tenantId: number,
  contentType: string,
  displayField: string = "name"
): PuckRender {
  const cacheKey = `content:${tenantId}:${contentType}`;
  const source: PickerSource = {
    kind: "fetch",
    fetchItems: () => fetchContentItems(tenantId, contentType, displayField),
  };

  return function ContentPickerRender({ value, onChange }) {
    const arr = Array.isArray(value) ? (value as number[]) : [];
    return (
      <UniversalPicker
        source={source}
        mode="multi"
        layout="list"
        value={arr}
        onChange={(v) => onChange(Array.isArray(v) ? v : [])}
        emptyMessage={`No ${contentType} records yet`}
        cacheKey={cacheKey}
      />
    );
  };
}

/**
 * Link picker — choose an internal page or type a custom URL.
 * Value is a string (href).
 */
export function createLinkPickerRender(tenantId: number): PuckRender {
  const tabs: PickerTab[] = [
    {
      key: "pages",
      label: "Pages",
      source: { kind: "fetch", fetchItems: () => fetchPageItems(tenantId) },
      cacheKey: `pages:${tenantId}`,
    },
  ];

  return function LinkPickerRender({ value, onChange }) {
    return (
      <UniversalPicker
        layout="tabs"
        mode="single"
        tabs={tabs}
        externalInput={{
          tabKey: "custom",
          placeholder: "https://example.com or /path",
        }}
        value={typeof value === "string" ? value : null}
        onChange={(v) => onChange(typeof v === "string" ? v : "")}
        emptyMessage="No pages yet"
      />
    );
  };
}

/**
 * Multi-page picker — select multiple published pages to drive the
 * site nav link list. Value is stored denormalized as
 * `Array<{ id, title, href }>` so the block can render live without
 * cross-fetching. The Refresh button re-hits the API.
 */
export function createPagesMultiPickerRender(tenantId: number): PuckRender {
  const cacheKey = `pages-multi:${tenantId}`;
  return function PagesMultiPickerRender({ value, onChange }) {
    const arr = Array.isArray(value)
      ? (value as Array<{ id: number; title: string; href: string }>)
      : [];
    const selectedIds = arr.map((p) => p.id);

    // Mirror of the latest fetched items, used to resolve new selections
    // into their denormalized {id,title,href} shape. Seeded from the
    // picker cache so cache hits (no fetch) still resolve correctly.
    const itemsRef = useRef<PickerItem[]>(getCached(cacheKey) ?? []);

    // Stable fetchItems — does a real network call every invocation, and
    // updates the mirror. The picker re-calls this on its own `refreshKey`
    // bump (refresh button).
    const source = useMemo<PickerSource>(() => {
      return {
        kind: "fetch",
        fetchItems: async () => {
          const res = await fetch(
            `/api/admin/content/pages?tenantId=${tenantId}`,
            { cache: "no-store" },
          );
          const data = (await res.json()) as {
            items?: Array<{ id: number; title: string; slug: string }>;
          };
          const mapped: PickerItem[] = (data.items ?? []).map((p) => ({
            id: p.id,
            label: p.title,
            subtitle: `/${p.slug}`,
            meta: { title: p.title, href: `/${p.slug}` },
          }));
          itemsRef.current = mapped;
          return mapped;
        },
      };
      // tenantId is stable per editor mount
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantId]);

    return (
      <UniversalPicker
        source={source}
        mode="multi"
        layout="list"
        value={selectedIds}
        onChange={(v) => {
          if (!Array.isArray(v)) return onChange([]);
          const ids = v as Array<string | number>;
          const existingById = new Map(arr.map((p) => [p.id, p]));
          const selectedSet = new Set(ids.map((id) => Number(id)));

          // Always emit selected pages in the canonical order returned
          // by the API (sort_order asc), regardless of click sequence.
          // This means re-selecting a page restores it to its proper
          // position in the nav rather than appending to the end.
          const out: Array<{ id: number; title: string; href: string }> = [];
          const seen = new Set<number>();
          for (const item of itemsRef.current) {
            const numId = Number(item.id);
            if (!selectedSet.has(numId)) continue;
            seen.add(numId);
            const prior = existingById.get(numId);
            if (prior) {
              out.push(prior);
              continue;
            }
            const meta =
              (item.meta as { title?: string; href?: string } | undefined) ??
              {};
            out.push({
              id: numId,
              title: meta.title ?? item.label,
              href: meta.href ?? `/${item.label}`,
            });
          }
          // Fallback: any selected ids not yet in itemsRef (cache miss
          // edge case) keep their click order at the end.
          for (const id of ids) {
            const numId = Number(id);
            if (seen.has(numId)) continue;
            const prior = existingById.get(numId);
            if (prior) out.push(prior);
          }
          onChange(out);
        }}
        emptyMessage="No published pages yet"
        cacheKey={cacheKey}
      />
    );
  };
}

/**
 * Emoji picker — value is a single emoji char string.
 */
export function createEmojiPickerRender(): PuckRender {
  return function EmojiPickerRender({ value, onChange }) {
    return (
      <UniversalPicker
        source={{ kind: "emoji" }}
        layout="emojiGrid"
        mode="single"
        value={typeof value === "string" ? value : ""}
        onChange={(v) => onChange(typeof v === "string" ? v : "")}
      />
    );
  };
}

/**
 * Date picker — value is a YYYY-MM-DD string.
 */
export function createDatePickerRender(): PuckRender {
  return function DatePickerRender({ value, onChange }) {
    return (
      <UniversalPicker
        source={{ kind: "calendar" }}
        layout="calendar"
        mode="single"
        value={typeof value === "string" ? value : ""}
        onChange={(v) => onChange(typeof v === "string" ? v : "")}
      />
    );
  };
}

/**
 * Address picker — Nominatim autocomplete.
 *
 * `onSelect` is called with the full place meta (address, city, lat, lng,
 * embedUrl, …) so the caller can atomically update multiple sibling fields
 * (e.g. Map block: `address` + `embedUrl`).
 *
 * `fieldKind` controls what scalar gets stored in the block's value:
 *   - "full":  full display name (default)
 *   - "city":  city only
 *   - "venue": first component of the display name (approximates venue name)
 *
 * The input field doubles as the search query and the stored value —
 * when a suggestion is selected, the input is replaced with the scalar.
 */
export function createAddressPickerRender(options: {
  fieldKind?: "full" | "city" | "venue";
  onSelect?: (meta: Record<string, unknown>) => void;
} = {}): PuckRender {
  const { fieldKind = "full", onSelect } = options;

  return function AddressPickerRender({ value, onChange }) {
    return (
      <AddressPickerInner
        value={typeof value === "string" ? value : ""}
        onChange={(v) => onChange(v)}
        fieldKind={fieldKind}
        onSelect={onSelect}
      />
    );
  };
}

function AddressPickerInner({
  value,
  onChange,
  fieldKind,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  fieldKind: "full" | "city" | "venue";
  onSelect?: (meta: Record<string, unknown>) => void;
}) {
  const [query, setQuery] = useState(value);
  const [items, setItems] = useState<PickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep input in sync when parent value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      searchAddresses(query)
        .then((res) => setItems(res))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handlePick = (item: PickerItem) => {
    const meta = (item.meta ?? {}) as Record<string, unknown>;
    const scalar =
      fieldKind === "city"
        ? String(meta.city ?? item.label)
        : fieldKind === "venue"
          ? item.label.split(",")[0]?.trim() ?? item.label
          : item.label;
    setQuery(scalar);
    onChange(scalar);
    onSelect?.(meta);
    setOpen(false);
  };

  return (
    <div className="relative space-y-1">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Start typing an address..."
        className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs"
      />
      {open && (loading || items.length > 0 || query.trim().length >= 3) && (
        <div className="absolute left-0 right-0 z-10 max-h-56 overflow-y-auto rounded border bg-popover shadow-md">
          {loading ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">Searching...</div>
          ) : items.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">No results</div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePick(item)}
                className="flex w-full items-start gap-2 border-b px-2 py-1.5 text-left text-xs last:border-b-0 hover:bg-accent"
              >
                <span className="mt-0.5">📍</span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{item.label}</span>
                  {item.subtitle && (
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {item.subtitle}
                    </span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Slot items field (header / footer) ──────────────────────────────────

import {
  SlotItemsEditor,
  type SlotItemValue,
} from "@repo/ui/slot-items-editor";

/**
 * Puck `custom` field render for a `HeaderSlotItem[]` array
 * (header left/right slots, footer left/center/right slots).
 *
 * The caller supplies a stable `tenantId`; the editor uses a reusable
 * tenant-scoped media picker for `image` items, and exposes the full
 * per-item style surface (font, color, size, rounded, margin, etc.).
 */
export function createSlotItemsFieldRender(
  tenantId: number,
  options: { label?: string } = {},
): PuckRender {
  const imagePickerRender = createMediaPickerRender(tenantId, "image");

  return function SlotItemsFieldRender({ value, onChange }) {
    const items = Array.isArray(value) ? (value as SlotItemValue[]) : [];
    return (
      <div className="grid gap-1.5">
        {options.label && (
          <div className="text-xs font-medium text-foreground">
            {options.label}
          </div>
        )}
        <SlotItemsEditor
          value={items}
          onChange={(next) => onChange(next)}
          renderImagePicker={(imageId, setImageId) => {
            return imagePickerRender({
              value: imageId,
              onChange: (v) =>
                setImageId(typeof v === "number" ? v : null),
            });
          }}
          addLabel="Add item"
        />
      </div>
    );
  };
}

// ── Styled field render ─────────────────────────────────────────────────
//
// Wraps any base input (text, textarea, image picker, video picker, …) in
// the generic `StyledFieldEditor` so it gains a collapsible "Style" panel
// (color/size/weight/alignment/padding/etc.). The persisted value shape
// becomes `{ value, style? }` instead of a bare string/number.

import { StyledFieldEditor } from "@repo/ui/styled-field-editor";
import type { ContentStyleKind } from "@repo/ui/styled-field-editor";
import { Input } from "@repo/ui/input";

export type StyledBaseInput =
  | "text"
  | "textarea"
  | "media-image"
  | "media-video"
  | "none";

export function createStyledFieldRender(
  tenantId: number,
  options: {
    kind: ContentStyleKind;
    base: StyledBaseInput;
    label?: string;
    placeholder?: string;
  },
): PuckRender {
  // Pre-create the media picker once so it isn't re-bound on every keystroke.
  const mediaImage =
    options.base === "media-image"
      ? createMediaPickerRender(tenantId, "image")
      : null;
  const mediaVideo =
    options.base === "media-video"
      ? createMediaPickerRender(tenantId, "video")
      : null;

  return function StyledFieldRender({ value, onChange }) {
    if (options.base === "none") {
      // Style-only field — value is just the ContentStyle blob, no inner.
      const style = (value as never as { color?: string }) ?? {};
      return (
        <StyledFieldEditor<null>
          value={{ value: null, style }}
          onChange={(next) => onChange((next.style ?? {}) as unknown)}
          kind={options.kind}
          label={options.label}
          defaultInner={null}
          renderInput={() => null}
          styleOpen
        />
      );
    }
    if (options.base === "text") {
      return (
        <StyledFieldEditor<string>
          value={value as never}
          onChange={(next) => onChange(next as unknown)}
          kind={options.kind}
          label={options.label}
          defaultInner=""
          renderInput={(inner, set) => (
            <Input
              className="h-8"
              value={inner ?? ""}
              placeholder={options.placeholder}
              onChange={(e) => set(e.target.value)}
            />
          )}
        />
      );
    }
    if (options.base === "textarea") {
      return (
        <StyledFieldEditor<string>
          value={value as never}
          onChange={(next) => onChange(next as unknown)}
          kind={options.kind}
          label={options.label}
          defaultInner=""
          renderInput={(inner, set) => (
            <textarea
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={inner ?? ""}
              placeholder={options.placeholder}
              onChange={(e) => set(e.target.value)}
            />
          )}
        />
      );
    }
    const picker = options.base === "media-image" ? mediaImage : mediaVideo;
    return (
      <StyledFieldEditor<number | null>
        value={value as never}
        onChange={(next) => onChange(next as unknown)}
        kind={options.kind}
        label={options.label}
        defaultInner={null}
        renderInput={(inner, set) =>
          picker
            ? picker({
                value: inner,
                onChange: (v) => set(typeof v === "number" ? v : null),
              })
            : null
        }
      />
    );
  };
}

