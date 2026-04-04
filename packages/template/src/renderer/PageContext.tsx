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
