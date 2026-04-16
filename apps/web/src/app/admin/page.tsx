"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2, CreditCard, Users, FileText, Image, Eye, LayoutDashboard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAdmin } from "@/context/admin-context";
import { PageHeader, InfoCard, Chart, Filter } from "@/components/common";
import { Skeleton } from "@repo/ui/skeleton";

/* ── Types ─────────────────────────────────────────────────────────── */

interface StatCard {
  id: string; title: string; value: number; change: number;
  changeLabel: string; new30: number; icon: string;
}
interface ChartPoint { [key: string]: unknown; }
interface PlanPoint { name: string; value: number; [key: string]: unknown; }
interface ActivityItem {
  id: number; action: string; entity_type: string;
  entity_id?: string | number; created_at: string; tenant_id?: number;
}
interface RecentTenant {
  id: number; name: string; domain: string; plan: string; created_at: string;
}
interface DashboardSummary {
  totalMedia: number; totalStorageMb: number; totalPages: number;
  publishedPages: number; activeSubs: number; totalMembers: number;
  planCounts: Record<string, number>;
}
interface DashboardData {
  stats: StatCard[];
  charts: {
    activity: ChartPoint[];
    week: ChartPoint[];
    growth: ChartPoint[];
    plans: PlanPoint[];
    mediaByType: ChartPoint[];
    pageStatus: ChartPoint[];
    memberRoles: ChartPoint[];
    eventTypes: ChartPoint[];
    mediaUploads: ChartPoint[];
    storageGrowth: ChartPoint[];
  };
  recentActivity: ActivityItem[];
  recentTenants: RecentTenant[];
  summary: DashboardSummary;
}

/* ── Constants ─────────────────────────────────────────────────────── */

const ICON_MAP: Record<string, LucideIcon> = {
  building: Building2, "credit-card": CreditCard, users: Users,
  "file-text": FileText, image: Image, eye: Eye,
};

const ACTIVITY_RANGE_OPTIONS = [
  { value: "30d", label: "30 Days" },
  { value: "7d", label: "7 Days" },
];

const ACTION_CHIP: Record<string, { label: string; className: string }> = {
  created:     { label: "Created",     className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  updated:     { label: "Updated",     className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  deleted:     { label: "Deleted",     className: "bg-red-500/15 text-red-600 dark:text-red-400" },
  published:   { label: "Published",   className: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  unpublished: { label: "Unpublished", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  invited:     { label: "Invited",     className: "bg-primary/15 text-primary" },
  provisioned: { label: "Provisioned", className: "bg-primary/15 text-primary" },
};

const PLAN_CHIP: Record<string, string> = {
  free:    "bg-muted/60 text-muted-foreground",
  starter: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  growth:  "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  pro:     "bg-primary/15 text-primary",
  scale:   "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

function actionChip(action: string) {
  const key = action.toLowerCase();
  for (const [k, v] of Object.entries(ACTION_CHIP)) {
    if (key.includes(k)) return v;
  }
  return { label: action.replace(/_/g, " "), className: "bg-muted/50 text-muted-foreground" };
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/* ── Skeleton ──────────────────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl bg-card p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl bg-card p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-[220px] w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */

export default function AdminDashboard() {
  const { tenantId } = useAdmin();
  const isPlatformView = tenantId === null;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityRange, setActivityRange] = useState("30d");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = tenantId
        ? `/api/admin/metrics/dashboard?tenantId=${tenantId}`
        : "/api/admin/metrics/dashboard";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-sm text-destructive">
        {error ?? "Unknown error loading dashboard."}
      </div>
    );
  }

  const planTotal = data.charts.plans.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-1 flex-col gap-6 py-2">
      <PageHeader title="Dashboard" />
      <p className="text-muted-foreground -mt-4">
        {isPlatformView ? "Platform overview" : "Your site overview"}
      </p>

      {/* ── Row 1: KPI stat cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data.stats.map((stat) => (
          <InfoCard
            key={stat.id}
            title={stat.title}
            value={stat.value.toLocaleString()}
            icon={ICON_MAP[stat.icon] ?? LayoutDashboard}
            trend={`${stat.change >= 0 ? "+" : ""}${stat.change}%`}
            trendUp={stat.change >= 0}
            trendLabel={stat.changeLabel}
          />
        ))}
      </div>

      {/* ── Row 2: Growth area chart + Plan/Sub donut ────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title={isPlatformView ? "Tenant Growth" : "Page Growth"}
          subtitle="Cumulative count — last 30 days"
        >
          {data.charts.growth.length > 0 ? (
            <Chart
              type="area"
              data={data.charts.growth}
              xKey="date"
              series={[
                { key: "total", label: "Total" },
                { key: "new", label: "New" },
              ]}
              height={220}
              showLegend
            />
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No data yet
            </div>
          )}
        </InfoCard>

        <InfoCard
          title={isPlatformView ? "Plan Distribution" : "Subscription Status"}
          subtitle={`${planTotal.toLocaleString()} total`}
        >
          {data.charts.plans.length > 0 ? (
            <Chart
              type="donut"
              data={data.charts.plans}
              dataKey="value"
              nameKey="name"
              centerLabel={String(planTotal)}
              centerSub="total"
              height={220}
              showLegend
            />
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No data yet
            </div>
          )}
        </InfoCard>
      </div>

      {/* ── Row 3: Activity trend (area/bar) + Event types (bar) ─────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Activity Trend"
          subtitle="Events over time"
          actions={
            <Filter
              type="select"
              value={activityRange}
              onChange={setActivityRange}
              options={ACTIVITY_RANGE_OPTIONS}
              width="w-24"
            />
          }
        >
          {activityRange === "30d" ? (
            data.charts.activity.length > 0 ? (
              <Chart
                type="area"
                data={data.charts.activity}
                xKey="date"
                series={[{ key: "events", label: "Events" }]}
                height={220}
              />
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No events yet
              </div>
            )
          ) : data.charts.week.length > 0 ? (
            <Chart
              type="bar"
              data={data.charts.week}
              xKey="day"
              series={[{ key: "events", label: "Events" }]}
              height={220}
            />
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No events yet
            </div>
          )}
        </InfoCard>

        <InfoCard title="Top Event Types" subtitle="Most frequent events (30 days)">
          {data.charts.eventTypes.length > 0 ? (
            <Chart
              type="bar"
              data={data.charts.eventTypes}
              xKey="name"
              series={[{ key: "count", label: "Count" }]}
              height={220}
            />
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No event data yet
            </div>
          )}
        </InfoCard>
      </div>

      {/* ── Row 4: Pages published vs draft (stacked area) + Member roles (donut) */}
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard title="Page Status Over Time" subtitle="Published vs draft pages (30 days)">
          {data.charts.pageStatus.length > 0 ? (
            <Chart
              type="area"
              data={data.charts.pageStatus}
              xKey="date"
              series={[
                { key: "published", label: "Published" },
                { key: "draft", label: "Draft" },
              ]}
              height={220}
              showLegend
            />
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No page data yet
            </div>
          )}
        </InfoCard>

        <InfoCard
          title="Member Roles"
          subtitle={`${data.summary.totalMembers} total members`}
        >
          {data.charts.memberRoles.length > 0 ? (
            <Chart
              type="donut"
              data={data.charts.memberRoles}
              dataKey="count"
              nameKey="name"
              centerLabel={String(data.summary.totalMembers)}
              centerSub="members"
              height={220}
              showLegend
            />
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No member data yet
            </div>
          )}
        </InfoCard>
      </div>

      {/* ── Row 5: Media uploads (bar) + Media by type (donut) ───────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard title="Media Uploads" subtitle="Files uploaded per day (30 days)">
          {data.charts.mediaUploads.length > 0 ? (
            <Chart
              type="bar"
              data={data.charts.mediaUploads}
              xKey="date"
              series={[{ key: "uploads", label: "Uploads" }]}
              height={220}
            />
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No media data yet
            </div>
          )}
        </InfoCard>

        <InfoCard
          title="Media Library Breakdown"
          subtitle={`${data.summary.totalMedia} total files`}
        >
          {data.charts.mediaByType.length > 0 ? (
            <Chart
              type="donut"
              data={data.charts.mediaByType}
              dataKey="count"
              nameKey="name"
              centerLabel={String(data.summary.totalMedia)}
              centerSub="files"
              height={220}
              showLegend
            />
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No media yet
            </div>
          )}
        </InfoCard>
      </div>

      {/* ── Row 6: Storage growth (area) + Recent tenants / Content overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard title="Storage Growth" subtitle="Cumulative storage used (30 days)">
          {data.charts.storageGrowth.length > 0 ? (
            <Chart
              type="area"
              data={data.charts.storageGrowth}
              xKey="date"
              series={[{ key: "mb", label: "MB" }]}
              height={220}
            />
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No storage data yet
            </div>
          )}
        </InfoCard>

        {isPlatformView ? (
          <InfoCard title="Recent Tenants" subtitle="Newly added tenants">
            {data.recentTenants.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No tenants yet
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.recentTenants.map((t) => {
                  const initials = t.name.split(" ").slice(0, 2).map((w) => w.charAt(0)).join("").toUpperCase();
                  return (
                    <div key={t.id} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 text-xs font-bold text-primary">{initials}</div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium">{t.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{t.domain}</p>
                      </div>
                      <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize " + (PLAN_CHIP[t.plan.toLowerCase()] ?? "bg-muted/60 text-muted-foreground")}>{t.plan}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </InfoCard>
        ) : (
          <InfoCard title="Content Overview" subtitle="Pages, media & storage">
            <div className="space-y-4">
              {[
                { label: "Published Pages", value: data.summary.publishedPages, total: Math.max(data.summary.totalPages, 1) },
                { label: "Draft Pages", value: data.summary.totalPages - data.summary.publishedPages, total: Math.max(data.summary.totalPages, 1) },
                { label: "Media Files", value: data.summary.totalMedia, total: Math.max(data.summary.totalMedia, 1) },
                { label: "Members", value: data.summary.totalMembers, total: Math.max(data.summary.totalMembers, 1) },
              ].map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium tabular-nums">{item.value}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted/50">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${Math.round((item.value / item.total) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {data.summary.totalStorageMb > 0 && (
                <div className="mt-3 rounded-lg border border-border/30 bg-muted/30 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Storage used: </span>
                  <span className="font-semibold tabular-nums">
                    {data.summary.totalStorageMb >= 1024
                      ? `${(data.summary.totalStorageMb / 1024).toFixed(1)} GB`
                      : `${data.summary.totalStorageMb} MB`}
                  </span>
                </div>
              )}
            </div>
          </InfoCard>
        )}
      </div>

      {/* ── Row 7: Recent activity feed ──────────────────────────────── */}
      {data.recentActivity.length > 0 && (
        <InfoCard title="Recent Activity" subtitle="Latest audit log entries">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {data.recentActivity.map((item) => {
              const chip = actionChip(item.action);
              const entity = item.entity_type ? item.entity_type.replace(/_/g, " ") : "";
              return (
                <div key={item.id} className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-3 transition-colors hover:bg-muted/60">
                  <div className="flex items-center gap-1.5">
                    <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " + chip.className}>{chip.label}</span>
                    {entity && <span className="text-xs text-muted-foreground capitalize">{entity}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{timeAgo(item.created_at)}</p>
                </div>
              );
            })}
          </div>
        </InfoCard>
      )}
    </div>
  );
}
