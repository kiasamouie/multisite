"use client";

import { Resource, StatusCell, DateCell, LinkCell } from "@/components/admin";

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

export default function SubscriptionsPage() {
  return (
    <Resource<Subscription>
      resource="subscriptions"
      title="Subscriptions"
      searchField="stripe_subscription_id"
      searchPlaceholder="Search by Stripe subscription ID…"
      canSort
      columns={[
        { key: "stripe_subscription_id", label: "Subscription ID", render: LinkCell },
        { key: "stripe_customer_id", label: "Customer ID" },
        { key: "status", label: "Status", render: StatusCell, sortable: true },
        { key: "created_at", label: "Created", render: DateCell, sortable: true },
        { key: "current_period_end", label: "Period End", render: DateCell, sortable: true },
      ]}
      // Subscriptions are typically read-only in this view
      // Full CRUD might be handled via Stripe webhooks
      canCreate={false}
      canEdit={false}
      canDelete={false}
    />
  );
}
