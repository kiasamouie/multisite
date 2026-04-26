"use client";

import { createContext, useContext } from "react";
import type { PageMediaAsset } from "../types";

// ── Page Media Context ──

interface PageMediaContextValue {
  assets: PageMediaAsset[];
  getByUsageType: (usageType: string) => PageMediaAsset[];
}

const PageMediaContext = createContext<PageMediaContextValue>({
  assets: [],
  getByUsageType: () => [],
});

export function PageMediaProvider({
  assets,
  children,
}: {
  assets: PageMediaAsset[];
  children: React.ReactNode;
}) {
  const getByUsageType = (usageType: string) =>
    assets
      .filter((a) => a.usage_type === usageType)
      .sort((a, b) => a.position - b.position);

  return (
    <PageMediaContext.Provider value={{ assets, getByUsageType }}>
      {children}
    </PageMediaContext.Provider>
  );
}

export function usePageMedia() {
  return useContext(PageMediaContext);
}

// ── Page Flags Context ──

interface PageFlagsContextValue {
  flags: Record<string, boolean>;
  hasFlag: (key: string) => boolean;
}

const PageFlagsContext = createContext<PageFlagsContextValue>({
  flags: {},
  hasFlag: () => false,
});

export function PageFlagsProvider({
  flags,
  children,
}: {
  flags: Record<string, boolean>;
  children: React.ReactNode;
}) {
  const hasFlag = (key: string) => flags[key] ?? false;

  return (
    <PageFlagsContext.Provider value={{ flags, hasFlag }}>
      {children}
    </PageFlagsContext.Provider>
  );
}

export function usePageFlags() {
  return useContext(PageFlagsContext);
}

// ── Library Content Context ───────────────────────────────────────────────
//
// Provides access to tenant-owned content library rows (team_members,
// testimonials, portfolio_items, content_events, blog_posts) so blocks can
// resolve their selected `*Ids` arrays into real records without each one
// having to fetch.
//
// In SSR: the public PageRenderer hydrates this with pre-fetched rows.
// In Puck editor: the editor wraps with a client provider that fetches via
// the admin content API.

export type LibraryContentType =
  | "team"
  | "testimonials"
  | "portfolio"
  | "events"
  | "blog";

// Loose row type — blocks cast to their expected shape.
export type LibraryRow = Record<string, unknown> & { id: number };

interface LibraryContentContextValue {
  items: Partial<Record<LibraryContentType, LibraryRow[]>>;
  getItems: (type: LibraryContentType, ids?: number[] | null) => LibraryRow[];
  /** Force a refresh (editor only). No-op server-side. */
  refresh?: (type?: LibraryContentType) => void | Promise<void>;
}

const LibraryContentContext = createContext<LibraryContentContextValue>({
  items: {},
  getItems: () => [],
});

export function LibraryContentProvider({
  items,
  refresh,
  children,
}: {
  items: Partial<Record<LibraryContentType, LibraryRow[]>>;
  refresh?: (type?: LibraryContentType) => void | Promise<void>;
  children: React.ReactNode;
}) {
  const getItems = (type: LibraryContentType, ids?: number[] | null) => {
    const all = items[type] ?? [];
    if (!ids || ids.length === 0) return [];
    // Preserve the order the user selected them in.
    const byId = new Map(all.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter((r): r is LibraryRow => !!r);
  };

  return (
    <LibraryContentContext.Provider value={{ items, getItems, refresh }}>
      {children}
    </LibraryContentContext.Provider>
  );
}

export function useLibraryContent() {
  return useContext(LibraryContentContext);
}
