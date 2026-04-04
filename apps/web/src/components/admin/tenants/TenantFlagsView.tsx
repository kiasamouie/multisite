"use client";

import { useEffect, useState } from "react";
import { Switch } from "@repo/ui/switch";

interface FlagRow {
  key: string;
  enabled: boolean;
  isOverridden: boolean;
  overrideId: number | null;
}

interface FlagsResponse {
  plan: string;
  flags: FlagRow[];
}

interface TenantRow {
  id: number;
  name: string;
  plan: string;
}

interface TenantFlagsViewProps {
  tenant: TenantRow;
}

const FLAG_LABELS: Record<string, string> = {
  basic_pages:        "Basic Pages",
  contact_form:       "Contact Form",
  media_upload:       "Media Upload",
  custom_domain:      "Custom Domain",
  analytics:          "Analytics",
  blog:               "Blog",
  seo_tools:          "SEO Tools",
  advanced_analytics: "Advanced Analytics",
  api_access:         "API Access",
  white_label:        "White Label",
  priority_support:   "Priority Support",
  integrations:       "Integrations",
  admin_section:      "Admin Section",
};

const PLAN_COLOR: Record<string, string> = {
  starter: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  growth:  "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  pro:     "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
};

export function TenantFlagsView({ tenant }: TenantFlagsViewProps) {
  const [data, setData] = useState<FlagsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Per-flag saving and error states
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [flagErrors, setFlagErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);

    fetch(`/api/feature-flags?tenantId=${tenant.id}`)
      .then((res) => {
        if (!res.ok) return res.json().then((e) => Promise.reject(e.error ?? "Failed to load"));
        return res.json() as Promise<FlagsResponse>;
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(String(err));
        setLoading(false);
      });
  }, [tenant.id]);

  const handleToggle = async (key: string, enabled: boolean) => {
    if (!data) return;

    // Optimistic update
    setData((prev) =>
      prev
        ? {
            ...prev,
            flags: prev.flags.map((f) =>
              f.key === key ? { ...f, enabled, isOverridden: true } : f
            ),
          }
        : prev
    );
    setSaving((s) => ({ ...s, [key]: true }));
    setFlagErrors((e) => ({ ...e, [key]: "" }));

    try {
      const res = await fetch("/api/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenant.id, key, enabled }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Save failed");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      // Revert optimistic update
      setData((prev) =>
        prev
          ? {
              ...prev,
              flags: prev.flags.map((f) =>
                f.key === key ? { ...f, enabled: !enabled } : f
              ),
            }
          : prev
      );
      setFlagErrors((e) => ({ ...e, [key]: msg }));
      // Clear error after 3s
      setTimeout(() => setFlagErrors((e) => ({ ...e, [key]: "" })), 3000);
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  };

  const planColorClass =
    PLAN_COLOR[data?.plan ?? tenant.plan] ?? PLAN_COLOR.starter;

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        <div className="flex items-center gap-2 pb-2">
          <div className="h-5 w-20 animate-pulse rounded bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-5 w-9 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6">
      {/* Tenant meta row */}
      <div className="mb-5 flex items-center gap-2 text-sm">
        <span className="font-medium text-foreground">{tenant.name}</span>
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${planColorClass}`}
        >
          {data.plan}
        </span>
      </div>

      {/* Flag list */}
      <ul className="divide-y divide-border">
        {data.flags.map((flag) => (
          <li key={flag.key} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {FLAG_LABELS[flag.key] ?? flag.key}
              </p>
              {flag.isOverridden && (
                <p className="mt-0.5 text-[11px] font-medium text-blue-500">
                  Custom override
                </p>
              )}
              {flagErrors[flag.key] && (
                <p className="mt-0.5 text-[11px] text-red-500">{flagErrors[flag.key]}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {saving[flag.key] && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
              )}
              <Switch
                checked={flag.enabled}
                disabled={saving[flag.key]}
                onCheckedChange={(enabled) => handleToggle(flag.key, enabled)}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
