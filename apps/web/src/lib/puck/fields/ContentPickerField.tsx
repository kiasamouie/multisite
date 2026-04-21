"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@repo/ui/input";
import { Button } from "@repo/ui/button";
import { Check, Search, X, Database } from "lucide-react";

interface ContentRecord {
  id: number;
  name?: string;
  title?: string;
  [key: string]: unknown;
}

interface ContentPickerFieldProps {
  /** Array of content record IDs (or full record array for backward compat) */
  value: number[];
  onChange: (ids: number[]) => void;
  tenantId: number;
  /** Which content type API to fetch: "team" | "testimonials" | "portfolio" | "blog" | "events" */
  contentType: string;
  /** Display field to show in the picker list */
  displayField?: string;
}

/**
 * ContentPickerField — lets editors pick multiple records from the content library.
 * Stores an array of record IDs in the block data.
 */
export function ContentPickerField({
  value,
  onChange,
  tenantId,
  contentType,
  displayField = "name",
}: ContentPickerFieldProps) {
  const [records, setRecords] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/content/${contentType}?tenantId=${tenantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setRecords(data.items ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tenantId, contentType]);

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter((r) => {
      const label = String(r[displayField] || r.name || r.title || "");
      return label.toLowerCase().includes(q);
    });
  }, [records, search, displayField]);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const toggle = useCallback(
    (id: number) => {
      if (selectedSet.has(id)) {
        onChange(value.filter((v) => v !== id));
      } else {
        onChange([...value, id]);
      }
    },
    [onChange, value, selectedSet]
  );

  const getLabel = (r: ContentRecord) =>
    String(r[displayField] || r.name || r.title || `#${r.id}`);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading {contentType}...
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
        <Database className="mx-auto mb-1 h-5 w-5 opacity-50" />
        No {contentType} records yet. Create them in the {contentType} admin section.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Selected count */}
      {value.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="h-3 w-3" />
          {value.length} selected
          <Button variant="ghost" size="sm" className="ml-auto h-5 text-xs px-1" onClick={() => onChange([])}>
            <X className="h-3 w-3" /> Clear
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${contentType}...`}
          className="h-7 pl-7 text-xs"
        />
      </div>

      {/* Record list */}
      <div className="max-h-48 overflow-y-auto rounded border divide-y">
        {filtered.map((record) => {
          const isSelected = selectedSet.has(record.id);
          return (
            <button
              key={record.id}
              type="button"
              onClick={() => toggle(record.id)}
              className={`flex w-full items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent transition-colors ${
                isSelected ? "bg-accent/50 font-medium" : ""
              }`}
            >
              <div className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border"
              }`}>
                {isSelected && <Check className="h-2.5 w-2.5" />}
              </div>
              <span>{getLabel(record)}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-2 text-center text-xs text-muted-foreground">No results</div>
        )}
      </div>
    </div>
  );
}

/**
 * Factory for Puck custom field render function bound to a tenant + content type.
 */
export function createContentPickerRender(tenantId: number, contentType: string, displayField = "name") {
  return function ContentPickerRender({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
    const ids = Array.isArray(value) ? value.filter((v): v is number => typeof v === "number") : [];
    return (
      <ContentPickerField
        tenantId={tenantId}
        contentType={contentType}
        displayField={displayField}
        value={ids}
        onChange={(newIds) => onChange(newIds)}
      />
    );
  };
}
