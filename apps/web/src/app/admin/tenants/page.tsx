"use client";

import { useEffect, useState, useMemo, type FormEvent } from "react";
import {
  useSupabaseList,
  useSupabaseDelete,
  useCrudPanel,
  type SupabaseFilter,
} from "@/hooks/useSupabase";
import {
  PageHeader,
  DataView,
  CrudModal,
  StatusBadge,
  InfoCard,
} from "@/components/common";
import type { Column } from "@repo/ui/admin/components";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select";
import { Switch } from "@repo/ui/switch";
import {
  Globe, Settings, SlidersHorizontal, Trash2,
  Building2, CreditCard, Users, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { buildTenantUrl } from "@/lib/url";

interface TenantRecord extends Record<string, unknown> {
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

function formatDate(v: unknown): string {
  if (!v) return "—";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
}

/* ── Flag labels and plan colors ────────────────────────────────────── */

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

function TenantDetailsContent({ tenant }: { tenant: TenantRecord }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30 text-lg font-bold text-primary">
          {tenant.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold">{tenant.name}</p>
          <p className="text-sm text-muted-foreground">{tenant.domain}</p>
        </div>
      </div>
      <div className="divide-y divide-border/30 rounded-xl bg-muted/40">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-24 shrink-0 text-xs text-muted-foreground">Slug</span>
          <span className="font-mono text-xs">{tenant.slug || "—"}</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-24 shrink-0 text-xs text-muted-foreground">Plan</span>
          <StatusBadge status={tenant.plan} />
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-24 shrink-0 text-xs text-muted-foreground">Created</span>
          <span className="text-xs">{formatDate(tenant.created_at)}</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-24 shrink-0 text-xs text-muted-foreground">Updated</span>
          <span className="text-xs">{formatDate(tenant.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}

export default function TenantsPage() {
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([]);
  const [search, setSearch] = useState("");

  /* ── Stat banner data (inlined) ─────────────────────────────────────── */
  const [tenantStats, setTenantStats] = useState<{
    total: number; activeSubs: number; totalMembers: number; newThisMonth: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/metrics/dashboard")
      .then((r) => r.json())
      .then((data) => {
        const statArr: Array<{ id: string; value: number; new30: number }> = data?.stats ?? [];
        const ts = statArr.find((s) => s.id === "tenants");
        const ss = statArr.find((s) => s.id === "subscriptions");
        const ms = statArr.find((s) => s.id === "members");
        setTenantStats({
          total: ts?.value ?? 0,
          activeSubs: ss?.value ?? 0,
          totalMembers: ms?.value ?? 0,
          newThisMonth: ts?.new30 ?? 0,
        });
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
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
  }, []);

  const filters = useMemo<SupabaseFilter[]>(() => {
    const f: SupabaseFilter[] = [];
    if (search.trim()) f.push({ field: "name", operator: "contains", value: search });
    return f;
  }, [search]);

  const list = useSupabaseList<TenantRecord>({
    resource: "tenants",
    select: "*, feature_flags(key, enabled)",
    filters,
  });

  const crud = useCrudPanel<TenantRecord>();
  const flagsPanel = useCrudPanel<TenantRecord>();
  const { deleteRecord } = useSupabaseDelete("tenants");

  /* ── Feature flags state (inlined) ────────────────────────────── */
  const [flagsData, setFlagsData] = useState<{ plan: string; flags: Array<{ key: string; enabled: boolean; isOverridden: boolean; overrideId: number | null }> } | null>(null);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [flagsError, setFlagsError] = useState<string | null>(null);
  const [flagSaving, setFlagSaving] = useState<Record<string, boolean>>({});
  const [flagErrors, setFlagErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!flagsPanel.item) return;
    setFlagsLoading(true);
    setFlagsError(null);
    setFlagsData(null);
    fetch(`/api/feature-flags?tenantId=${flagsPanel.item.id}`)
      .then((res) => {
        if (!res.ok) return res.json().then((e) => Promise.reject(e.error ?? "Failed to load"));
        return res.json();
      })
      .then((json) => { setFlagsData(json); setFlagsLoading(false); })
      .catch((err: unknown) => { setFlagsError(String(err)); setFlagsLoading(false); });
  }, [flagsPanel.item]);

  const handleFlagToggle = async (key: string, enabled: boolean) => {
    if (!flagsData || !flagsPanel.item) return;
    setFlagsData((prev) => prev ? { ...prev, flags: prev.flags.map((f) => f.key === key ? { ...f, enabled, isOverridden: true } : f) } : prev);
    setFlagSaving((s) => ({ ...s, [key]: true }));
    setFlagErrors((e) => ({ ...e, [key]: "" }));
    try {
      const res = await fetch("/api/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: flagsPanel.item.id, key, enabled }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Save failed");
      }
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

  // Form state
  const [formData, setFormData] = useState({ name: "", domain: "", plan: "starter", adminEmail: "" });

  const openCreate = () => {
    setFormData({ name: "", domain: "", plan: "starter", adminEmail: "" });
    crud.openPanel("create");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    crud.setSubmitting(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          domain: formData.domain,
          plan: formData.plan,
          ...(formData.adminEmail.trim() ? { adminEmail: formData.adminEmail.trim() } : {}),
        }),
      });
      const body = await res.json().catch(() => ({})) as { error?: string; provisioning?: { pagesCreated: number; flagsCreated: number } };
      if (!res.ok) throw new Error(body.error ?? "Failed to create tenant");
      const p = body.provisioning;
      toast.success(`Tenant created — ${p?.pagesCreated ?? 0} pages, ${p?.flagsCreated ?? 0} flags provisioned`);
      crud.closePanel();
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      crud.setSubmitting(false);
    }
  };

  const handleEdit = async (row: TenantRecord) => {
    crud.setSubmitting(true);
    const planChanged = formData.plan !== row.plan;
    try {
      const res = await fetch(`/api/admin/tenants?id=${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name, plan: formData.plan }),
      });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Failed to update tenant");

      if (planChanged) {
        const syncRes = await fetch(`/api/admin/tenants/${row.id}/sync-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: formData.plan }),
        });
        const syncBody = await syncRes.json().catch(() => ({})) as { error?: string; pagesCreated?: number; flagsCreated?: number };
        if (!syncRes.ok) throw new Error(syncBody.error ?? "Plan sync failed");
        toast.success(`Plan changed to ${formData.plan} — ${syncBody.pagesCreated ?? 0} pages, ${syncBody.flagsCreated ?? 0} flags synced`);
      } else {
        toast.success("Tenant updated");
      }
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      crud.setSubmitting(false);
    }
  };

  const handleDelete = async (row: TenantRecord) => {
    try {
      await deleteRecord(row.id);
      toast.warning("Tenant deleted");
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const columns: Column<TenantRecord>[] = [
    {
      key: "name",
      label: "Tenant",
      sortable: true,
      render: (row) => {
        const letter = row.name.charAt(0).toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 text-xs font-bold text-primary">
              {letter}
            </div>
            <div>
              <p className="font-medium">{row.name}</p>
              {row.domain && <p className="text-xs text-muted-foreground">{row.domain}</p>}
            </div>
          </div>
        );
      },
    },
    {
      key: "domain",
      label: "Links",
      render: (row) => {
        if (!row.domain) return <span className="text-xs text-muted-foreground">—</span>;
        const adminEnabled = row.feature_flags?.some((f) => f.key === "admin_section" && f.enabled);
        return (
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <a href={buildTenantUrl(row.domain)} target="_blank" rel="noopener noreferrer" title={`Open ${row.domain}`} className="text-muted-foreground hover:text-primary">
              <Globe className="h-4 w-4" />
            </a>
            {adminEnabled && (
              <a href={buildTenantUrl(row.domain, "/admin")} target="_blank" rel="noopener noreferrer" title={`Open ${row.domain}/admin`} className="text-muted-foreground hover:text-primary">
                <Settings className="h-4 w-4" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      key: "plan",
      label: "Plan",
      sortable: true,
      render: (row) => <StatusBadge status={row.plan} />,
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      render: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.created_at)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageHeader
        title="Tenants"
        actions={
          <Button size="sm" onClick={openCreate}>+ Add Tenant</Button>
        }
      />

      {/* Stats row */}
      {tenantStats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <InfoCard title="Total Tenants" value={tenantStats.total} icon={Building2} />
          <InfoCard title="Active Subscriptions" value={tenantStats.activeSubs} icon={CreditCard} />
          <InfoCard title="Total Members" value={tenantStats.totalMembers} icon={Users} />
          <InfoCard title="New This Month" value={tenantStats.newThisMonth} icon={TrendingUp} />
        </div>
      )}

      <DataView
        columns={columns}
        data={list.data}
        loading={list.isLoading}
        onRefresh={() => { list.invalidate(); toast.info("Refreshed", { duration: 1500 }); }}
        filter={{ search, onSearchChange: setSearch, searchPlaceholder: "Search tenants by name\u2026" }}
        mode="table"
        emptyMessage="No tenants found."
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        viewHref={(row) => `/admin/tenants/${row.id}`}
        canView
        viewModal={{
          title: (row) => row.name,
          content: (row) => <TenantDetailsContent tenant={row} />,
          size: "md",
        }}
        canEdit
        editModal={{
          title: () => "Edit Tenant",
          onOpen: (row) => setFormData({ name: row.name, domain: row.domain, plan: row.plan, adminEmail: "" }),
          content: () => (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tenant Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => setFormData((p) => ({ ...p, domain: e.target.value }))}
                  required
                  disabled
                  placeholder="e.g. acme.com"
                />
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
            </div>
          ),
          onSubmit: handleEdit,
          submitting: crud.submitting,
          size: "md",
        }}
        canDelete
        deleteConfig={{
          onConfirm: handleDelete,
          title: "Delete tenant?",
          description: "This action cannot be undone. All tenant data will be permanently removed.",
        }}
        rowActions={(row) => (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => flagsPanel.openPanel("view", row)} title="Feature Flags">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        )}
      />

      {/* Create Modal */}
      <CrudModal
        open={crud.open}
        onOpenChange={() => crud.closePanel()}
        mode="create"
        title="Add Tenant"
        size="md"
        onSubmit={handleSubmit}
        submitting={crud.submitting}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tenant Name</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              value={formData.domain}
              onChange={(e) => setFormData((p) => ({ ...p, domain: e.target.value }))}
              required
              placeholder="e.g. acme.com"
            />
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
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Admin Email <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input
              id="adminEmail"
              type="email"
              value={formData.adminEmail}
              onChange={(e) => setFormData((p) => ({ ...p, adminEmail: e.target.value }))}
              placeholder="admin@example.com"
            />
          </div>
        </div>
      </CrudModal>

      {/* Feature Flags Modal */}
      <CrudModal
        open={flagsPanel.open}
        onOpenChange={() => { flagsPanel.closePanel(); list.invalidate(); }}
        mode="view"
        title="Feature Flags"
        description={flagsPanel.item ? `${flagsPanel.item.name} — ${flagsPanel.item.plan} plan` : ""}
        size="md"
      >
        {flagsPanel.item && (
          <div className="p-6">
            <div className="mb-5 flex items-center gap-2 text-sm">
              <span className="font-medium text-foreground">{flagsPanel.item.name}</span>
              <span className={"inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize " + (PLAN_COLOR[flagsData?.plan ?? flagsPanel.item.plan] ?? PLAN_COLOR.starter)}>
                {flagsData?.plan ?? flagsPanel.item.plan}
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
            ) : flagsError ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{flagsError}</div>
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
        )}
      </CrudModal>

    </div>
  );
}
