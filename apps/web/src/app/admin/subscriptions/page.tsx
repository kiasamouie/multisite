"use client";

import { useState, useMemo } from "react";
import { useAdmin } from "@/context/admin-context";
import {
  useSupabaseList,
  type SupabaseFilter,
} from "@/hooks/useSupabase";
import {
  PageHeader,
  DataView,
  EnumBadge,
  ReadOnlyField,
} from "@/components/common";
import type { Column } from "@repo/ui/admin/components";

interface Subscription extends Record<string, unknown> {
  id: number;
  tenant_id: number;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  price_id: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  tenants?: { id: number; name: string };
}

function formatDate(v: unknown): string {
  if (!v) return "—";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
}

export default function SubscriptionsPage() {
  const { tenantId } = useAdmin();
  const isSuper = tenantId === null;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");

  const tenantList = useSupabaseList<{ id: number; name: string } & Record<string, unknown>>({
    resource: "tenants",
    select: "id, name",
    enabled: isSuper,
    pageSize: 200,
  });

  const filters = useMemo<SupabaseFilter[]>(() => {
    const f: SupabaseFilter[] = [];
    if (tenantId !== null) f.push({ field: "tenant_id", operator: "eq", value: tenantId });
    if (isSuper && tenantFilter) f.push({ field: "tenant_id", operator: "eq", value: Number(tenantFilter) });
    if (search.trim()) f.push({ field: "stripe_subscription_id", operator: "contains", value: search });
    if (statusFilter) f.push({ field: "status", operator: "eq", value: statusFilter });
    return f;
  }, [tenantId, isSuper, search, statusFilter, tenantFilter]);

  const list = useSupabaseList<Subscription>({
    resource: "subscriptions",
    select: isSuper ? "*, tenants(id, name)" : "*",
    filters,
  });

  const columns: Column<Subscription>[] = [
    {
      key: "stripe_subscription_id",
      label: "Subscription ID",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs">{row.stripe_subscription_id}</span>
      ),
    },
    { key: "stripe_customer_id", label: "Customer ID", sortable: true },
    ...(isSuper ? [{
      key: "tenants" as keyof Subscription & string,
      label: "Tenant",
      render: (row: Subscription) => (
        <span className="text-xs">{row.tenants?.name ?? "—"}</span>
      ),
    }] : []),
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => <EnumBadge status={row.status} />,
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      render: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.created_at)}</span>,
    },
    {
      key: "current_period_end",
      label: "Period End",
      sortable: true,
      render: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.current_period_end)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageHeader title="Subscriptions" />

      <DataView
        columns={columns}
        data={list.data}
        loading={list.isLoading}
        onRefresh={() => list.invalidate()}
        filter={{
          search,
          onSearchChange: setSearch,
          searchPlaceholder: "Search by Stripe subscription ID\u2026",
          filters: [
            ...(isSuper ? [{
              type: "combobox" as const,
              label: "Tenant",
              value: tenantFilter,
              onChange: setTenantFilter,
              options: tenantList.data.map(t => ({ value: String(t.id), label: String(t.name) })),
              placeholder: "All tenants",
              searchPlaceholder: "Search tenants…",
              width: "200px",
            }] : []),
            {
              type: "chips" as const,
              inline: true,
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "trialing",   label: "Trialing",   color: { bg: "hsl(var(--secondary)/0.1)",  text: "hsl(var(--secondary))",  border: "hsl(var(--secondary)/0.2)" } },
                { value: "active",     label: "Active",     color: { bg: "hsl(var(--success)/0.1)",    text: "hsl(var(--success))",    border: "hsl(var(--success)/0.2)" } },
                { value: "past_due",   label: "Past Due",   color: { bg: "hsl(var(--warning)/0.1)",    text: "hsl(var(--warning))",    border: "hsl(var(--warning)/0.2)" } },
                { value: "incomplete", label: "Incomplete" },
                { value: "cancelled",  label: "Cancelled" },
              ],
            },
          ],
          hasFilters: search !== "" || statusFilter !== "" || tenantFilter !== "",
          onClear: () => { setSearch(""); setStatusFilter(""); setTenantFilter(""); },
        }}
        mode="table"
        emptyMessage="No subscriptions found."
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        pageSize={list.pageSize}
        onPageSizeChange={(s) => { list.setPageSize(s); list.setPage(1); }}
        viewHref={(row) => `/admin/subscriptions/${row.id}`}
        canView
        viewModal={{
          title: () => "Subscription Details",
          content: (row) => (
            <div className="space-y-4">
              <ReadOnlyField label="Subscription ID" value={row.stripe_subscription_id} />
              <ReadOnlyField label="Customer ID" value={row.stripe_customer_id} />
              <ReadOnlyField label="Status">
                <EnumBadge status={row.status} />
              </ReadOnlyField>
              <ReadOnlyField label="Price ID" value={row.price_id || "—"} />
              <ReadOnlyField label="Created" value={formatDate(row.created_at)} />
              <ReadOnlyField label="Period End" value={formatDate(row.current_period_end)} />
              <ReadOnlyField label="Updated" value={formatDate(row.updated_at)} />
            </div>
          ),
          size: "md",
        }}
      />

    </div>
  );
}
