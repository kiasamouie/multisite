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
  StatusBadge,
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
}

function formatDate(v: unknown): string {
  if (!v) return "—";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
}

export default function SubscriptionsPage() {
  const { tenantId } = useAdmin();
  const [search, setSearch] = useState("");

  const filters = useMemo<SupabaseFilter[]>(() => {
    const f: SupabaseFilter[] = [];
    if (tenantId !== null) f.push({ field: "tenant_id", operator: "eq", value: tenantId });
    if (search.trim()) f.push({ field: "stripe_subscription_id", operator: "contains", value: search });
    return f;
  }, [tenantId, search]);

  const list = useSupabaseList<Subscription>({
    resource: "subscriptions",
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
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
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
        filter={{ search, onSearchChange: setSearch, searchPlaceholder: "Search by Stripe subscription ID\u2026" }}
        mode="table"
        emptyMessage="No subscriptions found."
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        viewHref={(row) => `/admin/subscriptions/${row.id}`}
        canView
        viewModal={{
          title: () => "Subscription Details",
          content: (row) => (
            <div className="space-y-4">
              <ReadOnlyField label="Subscription ID" value={row.stripe_subscription_id} />
              <ReadOnlyField label="Customer ID" value={row.stripe_customer_id} />
              <ReadOnlyField label="Status">
                <StatusBadge status={row.status} />
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
