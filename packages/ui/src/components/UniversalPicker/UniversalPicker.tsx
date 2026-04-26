"use client";

/**
 * UniversalPicker — one component that handles every picker/input scenario.
 *
 * Modes (via `source` + `layout` params):
 *  - Media grid picker  → source:fetch/static,  layout:grid
 *  - Content list picker → source:fetch/static, layout:list, mode:multi
 *  - Link picker        → layout:tabs (pages source + externalInput)
 *  - Gallery picker     → source:fetch, layout:grid, mode:multi
 *  - Emoji picker       → source:emoji, layout:emojiGrid
 *  - Date picker        → source:calendar, layout:calendar
 *  - Address picker     → source:search, layout:list (debounced)
 *
 * Nothing about this component is specific to Puck or to the data being picked.
 * Puck field renders are thin factories that configure this component.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Check, RotateCw, Search, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { EMOJI_LIST, EMOJI_CATEGORIES, type EmojiCategory } from "./emoji-list";
import { getCached, setCached, invalidateCached } from "./picker-cache";

// ── Core types ────────────────────────────────────────────────────────────

export type PickerId = string | number;

export interface PickerItem {
  id: PickerId;
  label: string;
  subtitle?: string;
  imageUrl?: string;
  videoUrl?: string;
  badge?: string;
  meta?: Record<string, unknown>;
}

export type PickerSource =
  | { kind: "static"; items: PickerItem[] }
  | { kind: "fetch"; fetchItems: () => Promise<PickerItem[]> }
  | {
      kind: "search";
      searchItems: (query: string) => Promise<PickerItem[]>;
      debounceMs?: number;
      minChars?: number;
    }
  | { kind: "calendar" }
  | { kind: "emoji" };

export type PickerLayout =
  | "grid"
  | "list"
  | "tabs"
  | "calendar"
  | "emojiGrid";

export type PickerMode = "single" | "multi";

export interface PickerTab {
  key: string;
  label: string;
  source: PickerSource;
  /** Optional cache key for this tab's data source. */
  cacheKey?: string;
}

export interface UniversalPickerProps {
  /** Data source */
  source?: PickerSource;

  /** Selection mode */
  mode?: PickerMode;

  /** Layout style */
  layout?: PickerLayout;

  /** Current value */
  value?: PickerId | PickerId[] | string | null;

  /** Change handler. For calendar mode, value is an ISO date string. */
  onChange: (value: PickerId | PickerId[] | string | null) => void;

  /** Tabs for layout="tabs" mode (e.g. Link picker: pages + custom URL) */
  tabs?: PickerTab[];

  /**
   * External input configuration — lets a tab accept free-form text
   * (e.g. a custom URL that doesn't match any record).
   * Only used with layout="tabs".
   */
  externalInput?: {
    tabKey: string;
    placeholder?: string;
    /** Transform the typed value before calling onChange */
    format?: (raw: string) => string;
  };

  /** UX toggles */
  searchable?: boolean;
  refreshable?: boolean;
  clearable?: boolean;

  /** Messages */
  emptyMessage?: string;
  placeholder?: string;
  loadingLabel?: string;

  /** Per-item custom rendering */
  renderGridItem?: (item: PickerItem, selected: boolean) => ReactNode;
  renderListItem?: (item: PickerItem, selected: boolean) => ReactNode;
  renderPreview?: (item: PickerItem) => ReactNode;

  /** Max visible list height in px (default 240) */
  maxHeight?: number;

  /**
   * Optional cache key. When set, the first successful fetch is stored in a
   * module-level in-memory cache; subsequent re-mounts (e.g. when Puck
   * collapses/expands fields or switches blocks) read from the cache instead
   * of refetching. Pressing the refresh (↻) button always bypasses the cache.
   *
   * Recommended format: `"<scope>:<tenantId>:<extra>"`, e.g.
   *   `"media:42:image"`, `"content:42:team"`, `"pages:42"`.
   */
  cacheKey?: string;

  className?: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────

function asArray(v: UniversalPickerProps["value"]): PickerId[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string" || typeof v === "number") return [v];
  return [];
}

function isSelected(value: UniversalPickerProps["value"], id: PickerId): boolean {
  if (Array.isArray(value)) return value.includes(id);
  return value === id;
}

// ── Main component ────────────────────────────────────────────────────────

export function UniversalPicker(props: UniversalPickerProps) {
  const {
    source,
    mode = "single",
    layout = "list",
    value,
    onChange,
    tabs,
    externalInput,
    searchable = true,
    refreshable = true,
    clearable = true,
    emptyMessage,
    placeholder,
    loadingLabel = "Loading...",
    renderGridItem,
    renderListItem,
    renderPreview,
    maxHeight = 240,
    className,
  } = props;

  // Tabs dispatch
  if (layout === "tabs" && tabs && tabs.length > 0) {
    return (
      <TabsPicker
        tabs={tabs}
        externalInput={externalInput}
        value={value}
        onChange={onChange}
        searchable={searchable}
        refreshable={refreshable}
        clearable={clearable}
        emptyMessage={emptyMessage}
        loadingLabel={loadingLabel}
        renderListItem={renderListItem}
        maxHeight={maxHeight}
        className={className}
      />
    );
  }

  // (cacheKey is forwarded to ItemsPicker below; tabs use per-tab cacheKey)

  // Calendar dispatch
  if (layout === "calendar" || source?.kind === "calendar") {
    return (
      <CalendarPicker
        value={typeof value === "string" ? value : ""}
        onChange={(v) => onChange(v)}
        placeholder={placeholder}
        clearable={clearable}
        className={className}
      />
    );
  }

  // Emoji dispatch
  if (layout === "emojiGrid" || source?.kind === "emoji") {
    return (
      <EmojiPicker
        value={typeof value === "string" ? value : ""}
        onChange={(v) => onChange(v)}
        clearable={clearable}
        searchable={searchable}
        className={className}
      />
    );
  }

  // Items-based dispatch (grid / list)
  if (!source) {
    return (
      <div className="text-xs text-muted-foreground">No source configured</div>
    );
  }

  return (
    <ItemsPicker
      source={source}
      mode={mode}
      layout={layout as "grid" | "list"}
      value={value}
      onChange={onChange}
      searchable={searchable}
      refreshable={refreshable}
      clearable={clearable}
      emptyMessage={emptyMessage}
      loadingLabel={loadingLabel}
      renderGridItem={renderGridItem}
      renderListItem={renderListItem}
      renderPreview={renderPreview}
      maxHeight={maxHeight}
      cacheKey={props.cacheKey}
      className={className}
    />
  );
}

// ── ItemsPicker: grid/list backed by static/fetch/search source ───────────

interface ItemsPickerProps {
  source: PickerSource;
  mode: PickerMode;
  layout: "grid" | "list";
  value: UniversalPickerProps["value"];
  onChange: UniversalPickerProps["onChange"];
  searchable: boolean;
  refreshable: boolean;
  clearable: boolean;
  emptyMessage?: string;
  loadingLabel: string;
  renderGridItem?: UniversalPickerProps["renderGridItem"];
  renderListItem?: UniversalPickerProps["renderListItem"];
  renderPreview?: UniversalPickerProps["renderPreview"];
  maxHeight: number;
  cacheKey?: string;
  className?: string;
}

function ItemsPicker({
  source,
  mode,
  layout,
  value,
  onChange,
  searchable,
  refreshable,
  clearable,
  emptyMessage,
  loadingLabel,
  renderGridItem,
  renderListItem,
  renderPreview,
  maxHeight,
  cacheKey,
  className,
}: ItemsPickerProps) {
  // Seed initial state from cache so re-mounts don't flash a loading state.
  const initialFromCache =
    source.kind === "fetch" ? getCached(cacheKey) : undefined;

  const [items, setItems] = useState<PickerItem[]>(
    source.kind === "static"
      ? source.items
      : (initialFromCache ?? [])
  );
  const [loading, setLoading] = useState(
    source.kind === "fetch" ? !initialFromCache : source.kind !== "static"
  );
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load items for fetch source — skipped on cache hit (refresh button
  // bumps `refreshKey` *after* invalidating the cache, so manual refreshes
  // bypass this short-circuit).
  useEffect(() => {
    if (source.kind !== "fetch") return;
    const cached = getCached(cacheKey);
    if (cached) {
      setItems(cached);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    source
      .fetchItems()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        setCached(cacheKey, data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.kind === "fetch" ? source.fetchItems : null, refreshKey, cacheKey]);

  // Load items for search source (debounced)
  useEffect(() => {
    if (source.kind !== "search") return;
    const minChars = source.minChars ?? 2;
    const debounceMs = source.debounceMs ?? 300;

    if (search.trim().length < minChars) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setLoading(true);
    searchDebounceRef.current = setTimeout(() => {
      source
        .searchItems(search)
        .then((data) => setItems(data))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, debounceMs);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, source.kind, refreshKey]);

  // Keep static items in sync if the prop changes
  useEffect(() => {
    if (source.kind === "static") {
      setItems(source.items);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.kind === "static" ? source.items : null]);

  const filtered = useMemo(() => {
    if (source.kind === "search") return items; // server-side filtered
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        (it.subtitle?.toLowerCase().includes(q) ?? false)
    );
  }, [items, search, source.kind]);

  const selectedItems = useMemo(() => {
    const ids = asArray(value);
    return items.filter((it) => ids.includes(it.id));
  }, [items, value]);

  const handleToggle = useCallback(
    (id: PickerId) => {
      if (mode === "single") {
        onChange(isSelected(value, id) ? null : id);
      } else {
        const current = asArray(value);
        if (current.includes(id)) {
          onChange(current.filter((v) => v !== id));
        } else {
          onChange([...current, id]);
        }
      }
    },
    [mode, onChange, value]
  );

  const refresh = useCallback(() => {
    invalidateCached(cacheKey);
    setRefreshKey((k) => k + 1);
  }, [cacheKey]);
  const clearAll = useCallback(() => onChange(mode === "single" ? null : []), [mode, onChange]);

  const showSearch = searchable || source.kind === "search";
  const searchPlaceholder =
    source.kind === "search"
      ? `Search...`
      : `Filter ${filtered.length > 0 ? `(${filtered.length})` : ""}...`;

  const hasSelection = asArray(value).length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected preview (single-mode with renderPreview) */}
      {mode === "single" && selectedItems[0] && renderPreview && (
        <div className="relative">
          {renderPreview(selectedItems[0])}
          {clearable && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 bg-black/40 text-white hover:bg-black/60"
              onClick={() => onChange(null)}
              type="button"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Multi-mode selection summary */}
      {mode === "multi" && hasSelection && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="h-3 w-3" />
          <span>{asArray(value).length} selected</span>
          {clearable && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-5 px-1 text-xs"
              onClick={clearAll}
              type="button"
            >
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
      )}

      {/* Search + Refresh row */}
      {(showSearch || refreshable) && (
        <div className="flex gap-1">
          {showSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-7 pl-7 text-xs"
              />
            </div>
          )}
          {refreshable && source.kind !== "static" && (
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={refresh}
              title="Refresh"
              type="button"
            >
              <RotateCw className={cn("h-3 w-3", loading && "animate-spin")} />
            </Button>
          )}
        </div>
      )}

      {/* Loading / empty / items */}
      {loading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          {loadingLabel}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
          {source.kind === "search" && search.trim().length < (source.minChars ?? 2)
            ? `Type at least ${source.minChars ?? 2} characters to search`
            : emptyMessage ?? "No items"}
        </div>
      ) : layout === "grid" ? (
        <div
          className="grid grid-cols-3 gap-1.5 overflow-y-auto rounded-md border p-1.5"
          style={{ maxHeight }}
        >
          {filtered.map((item) => {
            const selected = isSelected(value, item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleToggle(item.id)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded border transition-all",
                  selected
                    ? "border-primary ring-2 ring-primary"
                    : "border-border hover:border-primary/50"
                )}
                title={item.label}
              >
                {renderGridItem ? (
                  renderGridItem(item, selected)
                ) : (
                  <DefaultGridItem item={item} />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div
          className="divide-y overflow-y-auto rounded border"
          style={{ maxHeight }}
        >
          {filtered.map((item) => {
            const selected = isSelected(value, item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleToggle(item.id)}
                className={cn(
                  "flex w-full items-center gap-2 px-2 py-1.5 text-xs transition-colors hover:bg-accent",
                  selected && "bg-accent/50 font-medium"
                )}
              >
                {renderListItem ? (
                  renderListItem(item, selected)
                ) : (
                  <DefaultListItem item={item} selected={selected} mode={mode} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Default item renderers ────────────────────────────────────────────────

function DefaultGridItem({ item }: { item: PickerItem }) {
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
    <div className="flex h-full w-full items-center justify-center bg-muted p-1 text-center text-[9px] text-muted-foreground">
      {item.label}
    </div>
  );
}

function DefaultListItem({
  item,
  selected,
  mode,
}: {
  item: PickerItem;
  selected: boolean;
  mode: PickerMode;
}) {
  return (
    <>
      <div
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded border transition-colors",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
          mode === "single" && "rounded-full"
        )}
      >
        {selected && <Check className="h-2.5 w-2.5" />}
      </div>
      <div className="flex-1 text-left">
        <div className="truncate">{item.label}</div>
        {item.subtitle && (
          <div className="truncate text-[10px] text-muted-foreground">{item.subtitle}</div>
        )}
      </div>
      {item.badge && (
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {item.badge}
        </span>
      )}
    </>
  );
}

// ── Tabs picker (wraps multiple ItemsPickers + optional external input) ────

interface TabsPickerProps {
  tabs: PickerTab[];
  externalInput?: UniversalPickerProps["externalInput"];
  value: UniversalPickerProps["value"];
  onChange: UniversalPickerProps["onChange"];
  searchable: boolean;
  refreshable: boolean;
  clearable: boolean;
  emptyMessage?: string;
  loadingLabel: string;
  renderListItem?: UniversalPickerProps["renderListItem"];
  maxHeight: number;
  className?: string;
}

function TabsPicker({
  tabs,
  externalInput,
  value,
  onChange,
  searchable,
  refreshable,
  clearable,
  emptyMessage,
  loadingLabel,
  renderListItem,
  maxHeight,
  className,
}: TabsPickerProps) {
  const allTabs = useMemo(() => {
    if (!externalInput) return tabs;
    const hasExternalTab = tabs.some((t) => t.key === externalInput.tabKey);
    return hasExternalTab
      ? tabs
      : [...tabs, { key: externalInput.tabKey, label: "Custom", source: { kind: "static", items: [] } as PickerSource }];
  }, [tabs, externalInput]);

  const [activeKey, setActiveKey] = useState<string>(() => {
    // Default: if value looks like an arbitrary URL (not matching any id), start on external tab
    if (
      externalInput &&
      typeof value === "string" &&
      value &&
      !value.startsWith("/")
    ) {
      return externalInput.tabKey;
    }
    return allTabs[0].key;
  });

  const activeTab = allTabs.find((t) => t.key === activeKey) ?? allTabs[0];
  const isExternalTab = externalInput && activeTab.key === externalInput.tabKey;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-1">
        {allTabs.map((tab) => (
          <Button
            key={tab.key}
            type="button"
            variant={tab.key === activeKey ? "default" : "outline"}
            size="sm"
            className="h-6 text-xs"
            onClick={() => setActiveKey(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isExternalTab ? (
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(externalInput!.format ? externalInput!.format(raw) : raw);
          }}
          placeholder={externalInput!.placeholder ?? "Enter URL..."}
          className="h-8 text-xs"
        />
      ) : (
        <ItemsPicker
          source={activeTab.source}
          mode="single"
          layout="list"
          value={value}
          onChange={onChange}
          searchable={searchable}
          refreshable={refreshable}
          clearable={clearable}
          emptyMessage={emptyMessage}
          loadingLabel={loadingLabel}
          renderListItem={renderListItem}
          maxHeight={maxHeight}
          cacheKey={activeTab.cacheKey}
        />
      )}
    </div>
  );
}

// ── Calendar picker (native date input) ───────────────────────────────────

interface CalendarPickerProps {
  value: string;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  clearable: boolean;
  className?: string;
}

function CalendarPicker({ value, onChange, placeholder, clearable, className }: CalendarPickerProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      <Input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder={placeholder}
        className="h-8 text-xs"
      />
      {clearable && value && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(null)}
          title="Clear"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// ── Emoji picker ──────────────────────────────────────────────────────────

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string | null) => void;
  searchable: boolean;
  clearable: boolean;
  className?: string;
}

function EmojiPicker({ value, onChange, searchable, clearable, className }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<EmojiCategory>(EMOJI_CATEGORIES[0].key);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return EMOJI_LIST.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }
    return EMOJI_LIST.filter((e) => e.category === activeCategory);
  }, [search, activeCategory]);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected preview */}
      <div className="flex items-center gap-2 rounded border bg-muted/50 p-2">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-background text-xl">
          {value || "—"}
        </div>
        <span className="text-xs text-muted-foreground">
          {value ? "Selected" : "No emoji selected"}
        </span>
        {clearable && value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6"
            onClick={() => onChange(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {searchable && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emoji..."
            className="h-7 pl-7 text-xs"
          />
        </div>
      )}

      {!search && (
        <div className="flex gap-0.5 overflow-x-auto">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                "rounded px-1.5 py-1 text-base transition-colors",
                cat.key === activeCategory ? "bg-accent" : "hover:bg-accent/50"
              )}
              title={cat.label}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      <div className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto rounded border p-1">
        {filtered.map((e) => (
          <button
            key={e.char}
            type="button"
            onClick={() => onChange(e.char)}
            className={cn(
              "aspect-square rounded text-xl transition-colors hover:bg-accent",
              value === e.char && "bg-accent ring-2 ring-primary"
            )}
            title={e.name}
          >
            {e.char}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-8 py-2 text-center text-xs text-muted-foreground">
            No emoji found
          </div>
        )}
      </div>
    </div>
  );
}
