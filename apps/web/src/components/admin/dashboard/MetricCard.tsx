"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { Skeleton } from "@repo/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CardContext = "tenants" | "subscriptions" | "members" | "content" | "activity";

export interface MetricCardFeatures {
  showPlanBreakdown?: boolean;
  showTenantList?: boolean;
  showStatusBreakdown?: boolean;
  showRoleBreakdown?: boolean;
  showPublishedCount?: boolean;
  showBlocksCount?: boolean;
  showMediaCount?: boolean;
  showAuditLog?: boolean;
}

export interface MetricCardProps {
  context: CardContext;
  tenantId?: number;
  features?: MetricCardFeatures;
  title?: string;
}

// ─── Response shapes ─────────────────────────────────────────────────────────

interface TenantsData {
  total: number;
  planCounts: Record<string, number>;
  tenants: { id: number; name: string; domain: string; plan: string; created_at: string }[];
}

interface SubscriptionsData {
  total: number;
  active: number;
  trialing: number;
  canceled: number;
  statusCounts: Record<string, number>;
}

interface MembersData {
  total: number;
  roleCounts: Record<string, number>;
}

interface ContentData {
  pages: number;
  publishedPages: number;
  sections: number;
  blocks: number;
  media: number;
}

interface ActivityData {
  recentEvents: { id: number; event_type: string; created_at: string; tenant_id: number }[];
  recentAuditLogs: { id: number; action: string; entity_type: string; created_at: string; tenant_id: number }[];
  eventCount: number;
}

type CardData = TenantsData | SubscriptionsData | MembersData | ContentData | ActivityData;

const DEFAULT_TITLES: Record<CardContext, string> = {
  tenants: "Tenants",
  subscriptions: "Subscriptions",
  members: "Members",
  content: "Content",
  activity: "Recent Activity",
};

// ─── Sub-views ────────────────────────────────────────────────────────────────

function TenantsView({ data, features }: { data: TenantsData; features: MetricCardFeatures }) {
  return (
    <>
      <CardHeader className="pb-2">
        <CardDescription>Total Tenants</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{data.total.toLocaleString()}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {features.showPlanBreakdown && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(data.planCounts).map(([plan, count]) => (
              <Badge key={plan} variant="secondary" className="capitalize">
                {plan}: {count}
              </Badge>
            ))}
          </div>
        )}
        {features.showTenantList && data.tenants.length > 0 && (
          <ul className="space-y-1.5">
            {data.tenants.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{t.name}</span>
                <Badge variant="outline" className="capitalize">{t.plan}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </>
  );
}

function SubscriptionsView({ data, features }: { data: SubscriptionsData; features: MetricCardFeatures }) {
  return (
    <>
      <CardHeader className="pb-2">
        <CardDescription>Total Subscriptions</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{data.total.toLocaleString()}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">{data.active}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">{data.trialing}</p>
            <p className="text-xs text-muted-foreground">Trialing</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-red-600 dark:text-red-400">{data.canceled}</p>
            <p className="text-xs text-muted-foreground">Canceled</p>
          </div>
        </div>
        {features.showStatusBreakdown && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(data.statusCounts).map(([status, count]) => (
              <Badge key={status} variant="secondary" className="capitalize">
                {status}: {count}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </>
  );
}

function MembersView({ data, features }: { data: MembersData; features: MetricCardFeatures }) {
  return (
    <>
      <CardHeader className="pb-2">
        <CardDescription>Total Members</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{data.total.toLocaleString()}</CardTitle>
      </CardHeader>
      <CardContent>
        {features.showRoleBreakdown && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(data.roleCounts).map(([role, count]) => (
              <Badge key={role} variant="secondary" className="capitalize">
                {role}: {count}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </>
  );
}

function ContentView({ data, features }: { data: ContentData; features: MetricCardFeatures }) {
  return (
    <>
      <CardHeader className="pb-2">
        <CardDescription>Total Pages</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{data.pages.toLocaleString()}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-center">
          {features.showPublishedCount && (
            <div>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">{data.publishedPages}</p>
              <p className="text-xs text-muted-foreground">Published</p>
            </div>
          )}
          {features.showBlocksCount && (
            <div>
              <p className="text-lg font-semibold">{data.blocks}</p>
              <p className="text-xs text-muted-foreground">Blocks</p>
            </div>
          )}
          {features.showMediaCount && (
            <div>
              <p className="text-lg font-semibold">{data.media}</p>
              <p className="text-xs text-muted-foreground">Media</p>
            </div>
          )}
        </div>
      </CardContent>
    </>
  );
}

function ActivityView({ data, features }: { data: ActivityData; features: MetricCardFeatures }) {
  const combined = [
    ...data.recentEvents.map((e) => ({
      id: `e-${e.id}`,
      label: e.event_type.replace(/_/g, " "),
      time: e.created_at,
    })),
    ...(features.showAuditLog
      ? data.recentAuditLogs.map((a) => ({
          id: `a-${a.id}`,
          label: `${a.action} ${a.entity_type}`,
          time: a.created_at,
        }))
      : []),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 8);

  return (
    <>
      <CardHeader className="pb-2">
        <CardDescription>Events</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{data.eventCount.toLocaleString()}</CardTitle>
      </CardHeader>
      <CardContent>
        {combined.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <ul className="space-y-1.5">
            {combined.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className="capitalize">{item.label}</span>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(item.time)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </>
  );
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

export function MetricCard({ context, tenantId, features = {}, title }: MetricCardProps) {
  const [data, setData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ context });
    if (tenantId != null) params.set("tenantId", String(tenantId));

    fetch(`/api/admin/metrics/card?${params}`)
      .then((r) => (r.ok ? r.json() : r.json().then((e: { error?: string }) => Promise.reject(e.error ?? "Failed"))))
      .then((d: CardData) => { setData(d); setLoading(false); })
      .catch((e: unknown) => { setError(String(e)); setLoading(false); });
  }, [context, tenantId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{title ?? DEFAULT_TITLES[context]}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {data && (
        <>
          {context === "tenants" && <TenantsView data={data as TenantsData} features={features} />}
          {context === "subscriptions" && <SubscriptionsView data={data as SubscriptionsData} features={features} />}
          {context === "members" && <MembersView data={data as MembersData} features={features} />}
          {context === "content" && <ContentView data={data as ContentData} features={features} />}
          {context === "activity" && <ActivityView data={data as ActivityData} features={features} />}
        </>
      )}
    </Card>
  );
}
