"use client";

/**
 * Fetches tenant library content (team, testimonials, portfolio, events, blog)
 * and exposes it through `LibraryContentProvider` from @repo/template.
 *
 * Used by the Puck editor so blocks can resolve their selected `*Ids` fields
 * into real library rows for live preview.
 */

import { useCallback, useEffect, useState } from "react";
import {
  LibraryContentProvider,
  type LibraryContentType,
  type LibraryRow,
} from "@repo/template/renderer/context";

const CONTENT_TYPES: LibraryContentType[] = [
  "team",
  "testimonials",
  "portfolio",
  "events",
  "blog",
];

type LibraryMap = Partial<Record<LibraryContentType, LibraryRow[]>>;

async function fetchContent(
  tenantId: number,
  type: LibraryContentType
): Promise<LibraryRow[]> {
  try {
    const res = await fetch(`/api/admin/content/${type}?tenantId=${tenantId}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: LibraryRow[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

export function EditorLibraryProvider({
  tenantId,
  children,
}: {
  tenantId: number;
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<LibraryMap>({});

  const load = useCallback(
    async (only?: LibraryContentType) => {
      const types = only ? [only] : CONTENT_TYPES;
      const results = await Promise.all(
        types.map(async (t) => [t, await fetchContent(tenantId, t)] as const)
      );
      setItems((prev) => {
        const next = { ...prev };
        for (const [t, rows] of results) next[t] = rows;
        return next;
      });
    },
    [tenantId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <LibraryContentProvider items={items} refresh={load}>
      {children}
    </LibraryContentProvider>
  );
}
