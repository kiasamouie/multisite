"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@repo/ui/input";
import { Button } from "@repo/ui/button";
import { Link, Search, ExternalLink } from "lucide-react";

interface PageItem {
  id: number;
  title: string;
  slug: string;
}

interface LinkPickerFieldProps {
  value: string;
  onChange: (url: string) => void;
  tenantId: number;
}

/**
 * LinkPickerField — lets editors pick an internal page link or type a URL.
 * Internal pages resolve to `/{slug}`, external URLs pass through.
 */
export function LinkPickerField({ value, onChange, tenantId }: LinkPickerFieldProps) {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"pages" | "custom">(
    value && !value.startsWith("/") && value.includes("://") ? "custom" : "pages"
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/content/pages?tenantId=${tenantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setPages(data.items ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tenantId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return pages;
    const q = search.toLowerCase();
    return pages.filter((p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
  }, [pages, search]);

  const selectedPage = useMemo(
    () => pages.find((p) => value === `/${p.slug}` || value === p.slug),
    [pages, value]
  );

  const handleSelectPage = useCallback(
    (slug: string) => onChange(`/${slug}`),
    [onChange]
  );

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex gap-1">
        <Button
          variant={mode === "pages" ? "default" : "outline"}
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={() => setMode("pages")}
        >
          <Link className="h-3 w-3" /> Pages
        </Button>
        <Button
          variant={mode === "custom" ? "default" : "outline"}
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={() => setMode("custom")}
        >
          <ExternalLink className="h-3 w-3" /> Custom URL
        </Button>
      </div>

      {mode === "custom" ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com or /path"
          className="h-7 text-xs"
        />
      ) : (
        <>
          {selectedPage && (
            <div className="flex items-center gap-2 rounded border px-2 py-1 text-xs">
              <Link className="h-3 w-3 text-primary" />
              <span className="font-medium">{selectedPage.title}</span>
              <span className="text-muted-foreground">/{selectedPage.slug}</span>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pages..."
              className="h-7 pl-7 text-xs"
            />
          </div>

          {loading ? (
            <div className="py-2 text-xs text-muted-foreground">Loading pages...</div>
          ) : (
            <div className="max-h-36 overflow-y-auto rounded border divide-y">
              {filtered.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => handleSelectPage(page.slug)}
                  className={`flex w-full items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent transition-colors ${
                    value === `/${page.slug}` ? "bg-accent font-medium" : ""
                  }`}
                >
                  <Link className="h-3 w-3 text-muted-foreground" />
                  <span>{page.title}</span>
                  <span className="ml-auto text-muted-foreground">/{page.slug}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="py-2 text-center text-xs text-muted-foreground">No pages found</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Factory for Puck custom field render function bound to a tenant.
 */
export function createLinkPickerRender(tenantId: number) {
  return function LinkPickerRender({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
    return (
      <LinkPickerField
        tenantId={tenantId}
        value={typeof value === "string" ? value : ""}
        onChange={(url) => onChange(url)}
      />
    );
  };
}
