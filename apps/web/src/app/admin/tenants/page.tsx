"use client";

import { useEffect, useState } from "react";
import { Resource, PlanBadgeCell, DateCell, buildUrl, TenantFlagsView } from "@/components/admin";
import { normalizeDomain } from "@repo/lib/domain";

interface PlanOption {
  value: string;
  label: string;
}

export default function TenantsPage() {
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch plan options from API
    fetch("/api/admin/plans")
      .then((res) => res.json())
      .then((data) => {
        setPlanOptions(data.plans || []);
      })
      .catch((err) => {
        console.error("Failed to fetch plans:", err);
        // Fallback to defaults if fetch fails
        setPlanOptions([
          { value: "starter", label: "Starter" },
          { value: "growth", label: "Growth" },
          { value: "pro", label: "Pro" },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading plans...</div>;
  }

  return (
    <Resource
      resource="tenants"
      title="Tenants"
      searchField="name"
      searchPlaceholder="Search tenants by name…"
      createLabel="+ Add Tenant"
      canSort
      canRefresh
      select="*, feature_flags(id, key, enabled)"
      joins={[{ resource: "feature_flags", foreignKey: "tenant_id", idKey: "id" }]}
      columns={[
        { key: "name",         label: "Name" },
        {
          key: "domain",
          label: "Domain",
          render: (value: unknown, row: Record<string, unknown>) => {
            const domain = String(value ?? "");
            if (!domain) return <span className="text-xs text-muted-foreground">—</span>;
            const flags = row.feature_flags as Array<{ key: string; enabled: boolean }> | undefined;
            const adminEnabled = flags?.some((f) => f.key === "admin_section" && f.enabled);
            const frontUrl = buildUrl(domain);
            const adminUrl = buildUrl(domain, "/admin");
            return (
              <div className="flex flex-col gap-0.5">
                <a href={frontUrl} target="_blank" rel="noopener noreferrer"
                   className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                  {domain}
                </a>
                {adminEnabled && (
                  <a href={adminUrl} target="_blank" rel="noopener noreferrer"
                     className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                    {domain}/admin
                  </a>
                )}
              </div>
            );
          },
        },
        { key: "plan",         label: "Plan",    render: PlanBadgeCell, sortable: true },
        { key: "feature_flags", label: "Flags",
          render: (value) => {
            const flags = value as Array<{ key: string; enabled: boolean }> | undefined;
            if (!flags || flags.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
            const enabledCount = flags.filter(f => f.enabled).length;
            return <span className="text-xs font-medium">{enabledCount}/{flags.length} enabled</span>;
          }
        },
        { key: "created_at",   label: "Created", render: DateCell,      sortable: true },
      ]}
      createFields={[
        { key: "name",   label: "Tenant Name",            type: "text",   required: true },
        { key: "domain", label: "Domain (e.g. acme.com)", type: "text",   required: true },
        { key: "plan",   label: "Plan",                   type: "select", options: planOptions },
      ]}
      editFields={[
        { key: "name",   label: "Tenant Name", type: "text",   required: true },
        { key: "domain", label: "Domain",      type: "text",   disabledOnEdit: true },
        { key: "plan",   label: "Plan",        type: "select", options: planOptions },
      ]}
      defaultValues={{ name: "", domain: "", plan: "starter" }}
      transformValues={(values) => ({
        ...values,
        domain: normalizeDomain(String(values.domain ?? "")),
      })}
      sidePanel={{
        icon: "toggle_on",
        title: "Feature Flags",
        subtitle: (row) => `${(row as { name: string; plan: string }).name} — ${(row as { name: string; plan: string }).plan} plan`,
        view: (row) => (
          <TenantFlagsView tenant={row as { id: number; name: string; plan: string }} />
        ),
      }}
    />
  );
}
