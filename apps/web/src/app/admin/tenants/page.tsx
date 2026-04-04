"use client";

import { useEffect, useState } from "react";
import { Resource, PlanBadgeCell, DateCell, buildUrl, TenantFlagsView } from "@/components/admin";
import { normalizeDomain } from "@repo/lib/domain";
import { Globe, Settings, SlidersHorizontal } from "lucide-react";

interface PlanOption {
  value: string;
  label: string;
}

export default function TenantsPage() {
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([]);

  useEffect(() => {
    fetch("/api/admin/plans")
      .then((res) => res.json())
      .then((data) => setPlanOptions(data.plans || []))
      .catch(() =>
        setPlanOptions([
          { value: "starter", label: "Starter" },
          { value: "growth", label: "Growth" },
          { value: "pro", label: "Pro" },
        ])
      );
  }, []);

  return (
    <Resource
      resource="tenants"
      title="Tenants"
      searchField="name"
      searchPlaceholder="Search tenants by name…"
      createLabel="+ Add Tenant"
      canSort
      canRefresh
      select="*, feature_flags(key, enabled)"
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
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{domain}</span>
                <a href={frontUrl} target="_blank" rel="noopener noreferrer"
                   title={`Open ${domain}`}
                   className="text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400">
                  <Globe className="h-4 w-4" />
                </a>
                {adminEnabled && (
                  <a href={adminUrl} target="_blank" rel="noopener noreferrer"
                     title={`Open ${domain}/admin`}
                     className="text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400">
                    <Settings className="h-4 w-4" />
                  </a>
                )}
              </div>
            );
          },
        },
        { key: "plan",       label: "Plan",    render: PlanBadgeCell, sortable: true },
        { key: "created_at", label: "Created", render: DateCell,      sortable: true },
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
        icon: SlidersHorizontal,
        title: "Feature Flags",
        subtitle: (row) => `${(row as { name: string; plan: string }).name} — ${(row as { name: string; plan: string }).plan} plan`,
        view: (row) => (
          <TenantFlagsView tenant={row as { id: number; name: string; plan: string }} />
        ),
      }}
    />
  );
}
