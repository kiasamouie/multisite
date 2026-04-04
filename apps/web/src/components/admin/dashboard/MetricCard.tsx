"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CardContext = "tenants" | "subscriptions" | "members" | "content" | "activity";

export interface MetricCardFeatures {
  /** tenants context */
  showPlanBreakdown?: boolean;
  showTenantList?: boolean;
  /** subscriptions context */
  showStatusBreakdown?: boolean;
  /** members context */
  showRoleBreakdown?: boolean;
  /** content context */
  showPublishedCount?: boolean;
  showBlocksCount?: boolean;
  showMediaCount?: boolean;
  /** activity context */
  showAuditLog?: boolean;
}

export interface MetricCardProps {
  /** Which data context to load */
  context: CardContext;
  /** Scope to a specific tenant; omit for platform-wide view */
  tenantId?: number;
  /** Toggle optional sub-sections */
  features?: MetricCardFeatures;
  /** Override the default card title */
  title?: string;
}

// ─── Response shapes from /api/admin/metrics/card ────────────────────────────

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

// ─── Default titles per context ───────────────────────────────────────────────

const DEFAULT_TITLES: Record<CardContext, string> = {
  tenants: "Tenants",
  subscriptions: "Subscriptions",
  members: "Members",
  content: "Content",
  activity: "Recent Activity",
};

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-slate-200 text-slate-700",
  growth: "bg-blue-100 text-blue-700",
  pro: "bg-violet-100 text-violet-700",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trialing: "bg-yellow-100 text-yellow-700",
  canceled: "bg-red-100 text-red-700",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-violet-100 text-violet-700",
  admin: "bg-blue-100 text-blue-700",
  editor: "bg-slate-200 text-slate-700",
};

// ─── Subrenderers per context ─────────────────────────────────────────────────

function TenantsView({ data, features }: { data: TenantsData; features: MetricCardFeatures }) {
  return (
    <div className="space-y-4">
      <StatRow label="Total Tenants" value={data.total} />
      {features.showPlanBreakdown && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-slate-400">By Plan</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.planCounts).map(([plan, count]) => (
              <Badge key={plan} label={plan} value={count} colorClass={PLAN_COLORS[plan] ?? "bg-slate-100 text-slate-600"} />
            ))}
          </div>
        </div>
      )}
      {features.showTenantList && data.tenants.length > 0 && (
        <ul className="divide-y divide-white/5">
          {data.tenants.slice(0, 5).map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium text-slate-200">{t.name}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${PLAN_COLORS[t.plan] ?? "bg-slate-200 text-slate-600"}`}>
                {t.plan}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SubscriptionsView({ data, features }: { data: SubscriptionsData; features: MetricCardFeatures }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Active" value={data.active} color="text-green-400" />
        <StatTile label="Trialing" value={data.trialing} color="text-yellow-400" />
        <StatTile label="Canceled" value={data.canceled} color="text-red-400" />
      </div>
      {features.showStatusBreakdown && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-slate-400">By Status</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.statusCounts).map(([status, count]) => (
              <Badge key={status} label={status} value={count} colorClass={STATUS_COLORS[status] ?? "bg-slate-200 text-slate-600"} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MembersView({ data, features }: { data: MembersData; features: MetricCardFeatures }) {
  return (
    <div className="space-y-4">
      <StatRow label="Total Members" value={data.total} />
      {features.showRoleBreakdown && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-slate-400">By Role</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.roleCounts).map(([role, count]) => (
              <Badge key={role} label={role} value={count} colorClass={ROLE_COLORS[role] ?? "bg-slate-200 text-slate-600"} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ContentView({ data, features }: { data: ContentData; features: MetricCardFeatures }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatTile label="Pages" value={data.pages} />
      {features.showPublishedCount && <StatTile label="Published" value={data.publishedPages} color="text-green-400" />}
      {features.showBlocksCount && <StatTile label="Blocks" value={data.blocks} />}
      {features.showMediaCount && <StatTile label="Media" value={data.media} />}
    </div>
  );
}

function ActivityView({ data, features }: { data: ActivityData; features: MetricCardFeatures }) {
  const combined = [
    ...data.recentEvents.map((e) => ({
      id: `e-${e.id}`,
      label: e.event_type.replace(/_/g, " "),
      time: e.created_at,
      type: "event" as const,
    })),
    ...(features.showAuditLog
      ? data.recentAuditLogs.map((a) => ({
          id: `a-${a.id}`,
          label: `${a.action} ${a.entity_type}`,
          time: a.created_at,
          type: "audit" as const,
        }))
      : []),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 8);

  if (combined.length === 0) {
    return <p className="text-sm text-slate-500">No recent activity.</p>;
  }

  return (
    <ul className="space-y-2">
      {combined.map((item) => (
        <li key={item.id} className="flex items-center justify-between text-sm">
          <span className="capitalize text-slate-300">{item.label}</span>
          <span className="text-xs text-slate-500">{formatRelativeTime(item.time)}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Shared micro-components ──────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-2xl font-semibold text-slate-100">{value.toLocaleString()}</span>
    </div>
  );
}

function StatTile({ label, value, color = "text-slate-100" }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/5 p-3 text-center">
      <p className={`text-xl font-semibold ${color}`}>{value.toLocaleString()}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Badge({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <span className={`rounded px-2 py-1 text-xs font-medium ${colorClass}`}>
      {label}: {value}
    </span>
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

  const cardTitle = title ?? DEFAULT_TITLES[context];

  return (
    <div className="rounded-xl border border-white/5 bg-[hsl(var(--admin-surface))] p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">{cardTitle}</h3>

      {loading && (
        <div className="flex h-16 items-center justify-center">
          <span className="text-sm text-slate-500">Loading…</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {context === "tenants" && <TenantsView data={data as TenantsData} features={features} />}
          {context === "subscriptions" && <SubscriptionsView data={data as SubscriptionsData} features={features} />}
          {context === "members" && <MembersView data={data as MembersData} features={features} />}
          {context === "content" && <ContentView data={data as ContentData} features={features} />}
          {context === "activity" && <ActivityView data={data as ActivityData} features={features} />}
        </>
      )}
    </div>
  );
}
