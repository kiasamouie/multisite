"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@repo/lib/supabase/browser";
import { useAdmin } from "@/context/admin-context";
import { PageHeader, ReadOnlyField, DetailLayout, EnumBadge } from "@/components/common";
import { Button } from "@repo/ui/button";
import { Skeleton } from "@repo/ui/skeleton";
import { ArrowLeft } from "lucide-react";

interface Subscription {
  id: number;
  tenant_id: number;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  price_id: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  tenants?: { id: number; name: string; domain: string };
}

function formatDate(v: unknown): string {
  if (!v) return "—";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
}

export default function SubscriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { tenantId } = useAdmin();
  const isSuper = tenantId === null;
  const subId = Number(params.id);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const select = isSuper ? "*, tenants(id, name, domain)" : "*";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("subscriptions")
        .select(select)
        .eq("id", subId)
        .single();
      if (error || !data) throw new Error("Not found");
      setSubscription(data);
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [subId, isSuper]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="flex flex-col gap-6 py-2">
        <PageHeader
          title="Subscription Not Found"
          actions={
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/subscriptions")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          }
        />
      </div>
    );
  }

  const main = (
    <div className="space-y-4 rounded-xl bg-muted/40 p-5">
      <ReadOnlyField label="Subscription ID" value={subscription.stripe_subscription_id} />
      <ReadOnlyField label="Customer ID" value={subscription.stripe_customer_id} />
      <ReadOnlyField label="Status">
        <EnumBadge status={subscription.status} />
      </ReadOnlyField>
      <ReadOnlyField label="Price ID" value={subscription.price_id || "—"} />
      <ReadOnlyField label="Created" value={formatDate(subscription.created_at)} />
      <ReadOnlyField label="Period End" value={formatDate(subscription.current_period_end)} />
      <ReadOnlyField label="Updated" value={formatDate(subscription.updated_at)} />
      {isSuper && subscription.tenants && (
        <ReadOnlyField label="Tenant">
          <p className="text-sm font-medium">{subscription.tenants.name}</p>
          <p className="text-xs text-muted-foreground">{subscription.tenants.domain}</p>
        </ReadOnlyField>
      )}
    </div>
  );

  const sidebar = (
    <div className="space-y-4 rounded-xl bg-muted/40 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Info</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <EnumBadge status={subscription.status} />
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Renews</span>
          <span className="font-medium text-xs">{formatDate(subscription.current_period_end)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageHeader
        title="Subscription Details"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/subscriptions")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Subscriptions
          </Button>
        }
      />
      <DetailLayout main={main} sidebar={sidebar} />
    </div>
  );
}
