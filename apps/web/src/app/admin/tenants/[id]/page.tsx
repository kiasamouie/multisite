"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@repo/lib/supabase/browser";
import { useAdmin } from "@/context/admin-context";
import { PageHeader, ReadOnlyField, DetailLayout, EnumBadge } from "@/components/common";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select";
import { Switch } from "@repo/ui/switch";
import { Skeleton } from "@repo/ui/skeleton";
import { ArrowLeft, Globe, Settings, Pencil } from "lucide-react";
import { toast } from "sonner";
import { buildTenantUrl } from "@/lib/url";

interface TenantRecord {
  id: number;
  name: string;
  domain: string;
  slug: string;
  plan: string;
  created_at: string;
  updated_at: string;
  feature_flags?: Array<{ key: string; enabled: boolean }>;
}

interface PlanOption { value: string; label: string; }

const FLAG_LABELS: Record<string, string> = {
  basic_pages: "Basic Pages", contact_form: "Contact Form", media_upload: "Media Upload",
  custom_domain: "Custom Domain", analytics: "Analytics", blog: "Blog", seo_tools: "SEO Tools",
  advanced_analytics: "Advanced Analytics", api_access: "API Access", white_label: "White Label",
  priority_support: "Priority Support", integrations: "Integrations", admin_section: "Admin Section",
};

const PLAN_COLOR: Record<string, string> = {
  starter: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  growth: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  pro: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
};

function formatDate(v: unknown): string {
  if (!v) return "—";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantDbId = Number(params.id);

  const [tenant, setTenant] = useState<TenantRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", plan: "" });
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([]);

  /* ── Feature flags state ───────────────────────────────────────── */
  const [flagsData, setFlagsData] = useState<{ plan: string; flags: Array<{ key: string; enabled: boolean; isOverridden: boolean; overrideId: number | null }> } | null>(null);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [flagSaving, setFlagSaving] = useState<Record<string, boolean>>({});
  const [flagErrors, setFlagErrors] = useState<Record<string, string>>({});

  const fetchTenant = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("tenants")
        .select("*, feature_flags(key, enabled)")
        .eq("id", tenantDbId)
        .single();
      if (error || !data) throw new Error("Not found");
      setTenant(data);
      setFormData({ name: data.name, plan: data.plan });
    } catch {
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, [tenantDbId]);

  useEffect(() => {
    fetchTenant();
    fetch("/api/admin/plans")
      .then((res) => res.json())
      .then((data) => setPlanOptions(data.plans || []))
      .catch(() =>
        setPlanOptions([
          { value: "starter", label: "Starter" },
          { value: "growth", label: "Growth" },
          { value: "pro", label: "Pro" },
        ]),
      );
  }, [fetchTenant]);

  /* ── Fetch flags when tenant is loaded ─────────────────────────── */
  useEffect(() => {
    if (!tenant) return;
    setFlagsLoading(true);
    fetch(`/api/feature-flags?tenantId=${tenant.id}`)
      .then((res) => { if (!res.ok) throw new Error("Failed to load"); return res.json(); })
      .then((json) => { setFlagsData(json); setFlagsLoading(false); })
      .catch(() => setFlagsLoading(false));
  }, [tenant]);

  const handleFlagToggle = async (key: string, enabled: boolean) => {
    if (!flagsData || !tenant) return;
    setFlagsData((prev) => prev ? { ...prev, flags: prev.flags.map((f) => f.key === key ? { ...f, enabled, isOverridden: true } : f) } : prev);
    setFlagSaving((s) => ({ ...s, [key]: true }));
    setFlagErrors((e) => ({ ...e, [key]: "" }));
    try {
      const res = await fetch("/api/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenant.id, key, enabled }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error((b as { error?: string }).error ?? "Save failed"); }
      toast.success(`${FLAG_LABELS[key] ?? key} ${enabled ? "enabled" : "disabled"}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
      setFlagsData((prev) => prev ? { ...prev, flags: prev.flags.map((f) => f.key === key ? { ...f, enabled: !enabled } : f) } : prev);
      setFlagErrors((e) => ({ ...e, [key]: msg }));
      setTimeout(() => setFlagErrors((e) => ({ ...e, [key]: "" })), 3000);
    } finally {
      setFlagSaving((s) => ({ ...s, [key]: false }));
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSaving(true);
    const planChanged = formData.plan !== tenant.plan;
    try {
      const supabase = createBrowserClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("tenants")
        .update({ name: formData.name, plan: formData.plan })
        .eq("id", tenant.id);
      if (error) throw error;

      // If the plan changed, sync feature flags and template pages to the new plan
      if (planChanged) {
        const syncRes = await fetch(`/api/admin/tenants/${tenant.id}/sync-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: formData.plan }),
        });
        if (!syncRes.ok) {
          const body = await syncRes.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? "Plan sync failed");
        }
        const syncData = await syncRes.json() as { pagesCreated?: number; flagsCreated?: number };
        toast.success(
          `Plan changed to ${formData.plan} — ${syncData.pagesCreated ?? 0} pages, ${syncData.flagsCreated ?? 0} flags synced`
        );
      } else {
        toast.success("Tenant updated");
      }

      setEditing(false);
      fetchTenant();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col gap-6 py-2">
        <PageHeader
          title="Tenant Not Found"
          actions={
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/tenants")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          }
        />
      </div>
    );
  }

  const adminEnabled = tenant.feature_flags?.some((f) => f.key === "admin_section" && f.enabled);

  const main = (
    <div className="space-y-6">
      {/* Edit Form / Details */}
      {editing ? (
        <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-border p-5">
          <div className="space-y-2">
            <Label htmlFor="name">Tenant Name</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan">Plan</Label>
            <Select value={formData.plan} onValueChange={(v) => setFormData((p) => ({ ...p, plan: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {planOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4 rounded-xl bg-muted/40 p-5">
          <ReadOnlyField label="Name" value={tenant.name} />
          <ReadOnlyField label="Domain">
            <span className="font-mono text-muted-foreground">{tenant.domain}</span>
          </ReadOnlyField>
          <ReadOnlyField label="Slug" value={tenant.slug || "—"} />
          <ReadOnlyField label="Plan">
            <EnumBadge status={tenant.plan} />
          </ReadOnlyField>
          <ReadOnlyField label="Created" value={formatDate(tenant.created_at)} />
          <ReadOnlyField label="Updated" value={formatDate(tenant.updated_at)} />
        </div>
      )}

      {/* Feature Flags */}
      <div className="rounded-xl border border-border p-6">
        <div className="mb-5 flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">{tenant.name}</span>
          <span className={"inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize " + (PLAN_COLOR[flagsData?.plan ?? tenant.plan] ?? PLAN_COLOR.starter)}>
            {flagsData?.plan ?? tenant.plan}
          </span>
        </div>
        {flagsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-5 w-9 animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        ) : flagsData ? (
          <ul className="divide-y divide-border">
            {flagsData.flags.map((flag) => (
              <li key={flag.key} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{FLAG_LABELS[flag.key] ?? flag.key}</p>
                  {flag.isOverridden && <p className="mt-0.5 text-[11px] font-medium text-blue-500">Custom override</p>}
                  {flagErrors[flag.key] && <p className="mt-0.5 text-[11px] text-red-500">{flagErrors[flag.key]}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {flagSaving[flag.key] && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted border-t-foreground" />}
                  <Switch checked={flag.enabled} disabled={flagSaving[flag.key]} onCheckedChange={(enabled) => handleFlagToggle(flag.key, enabled)} />
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );

  const sidebar = (
    <div className="space-y-4">
      {/* Quick links */}
      <div className="rounded-xl bg-muted/40 p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Links</h3>
        {tenant.domain && (
          <a href={buildTenantUrl(tenant.domain)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <Globe className="h-4 w-4" /> Visit Site
          </a>
        )}
        {adminEnabled && tenant.domain && (
          <a href={buildTenantUrl(tenant.domain, "/admin")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <Settings className="h-4 w-4" /> Admin Panel
          </a>
        )}
      </div>

      {/* Stats summary */}
      <div className="rounded-xl bg-muted/40 p-4 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Feature Flags</h3>
        <p className="text-sm">
          {tenant.feature_flags?.filter((f) => f.enabled).length ?? 0} enabled / {tenant.feature_flags?.length ?? 0} total
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageHeader
        title={tenant.name}
        actions={
          <div className="flex gap-2">
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/tenants")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />
      <DetailLayout main={main} sidebar={sidebar} />
    </div>
  );
}
