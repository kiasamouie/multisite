"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Skeleton } from "@repo/ui/skeleton";
import { Badge } from "@repo/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { Progress } from "@repo/ui/progress";
import {
  Building2,
  CreditCard,
  Users,
  FileText,
  Image,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  LayoutDashboard,
} from "lucide-react";
import { useTenantAdmin } from "@/components/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatCard {
  id: string;
  title: string;
  value: number;
  change: number;
  changeLabel: string;
  new30: number;
  icon: string;
}

interface ChartPoint {
  date?: string;
  value?: number;
  total?: number;
  new?: number;
  events?: number;
  day?: string;
}

interface PlanPoint {
  name: string;
  value: number;
}

interface ActivityItem {
  id: number;
  action: string;
  entity_type: string;
  entity_id?: string | number;
  created_at: string;
  tenant_id?: number;
}

interface RecentTenant {
  id: number;
  name: string;
  domain: string;
  plan: string;
  created_at: string;
}

interface DashboardData {
  stats: StatCard[];
  charts: {
    activity: ChartPoint[];
    week: ChartPoint[];
    growth: ChartPoint[];
    plans: PlanPoint[];
  };
  recentActivity: ActivityItem[];
  recentTenants: RecentTenant[];
  summary: {
    totalMedia: number;
    totalStorageMb: number;
    totalPages: number;
    publishedPages: number;
    activeSubs: number;
    totalMembers: number;
    planCounts: Record<string, number>;
  };
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  building: Building2,
  "credit-card": CreditCard,
  users: Users,
  "file-text": FileText,
  image: Image,
  eye: Eye,
};

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// ─── Skeleton fallback ────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent><Skeleton className="h-[280px] w-full" /></CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent><Skeleton className="h-[280px] w-full" /></CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCardWidget({ stat }: { stat: StatCard }) {
  const Icon = ICON_MAP[stat.icon] ?? LayoutDashboard;
  const isPositive = stat.change > 0;
  const isNegative = stat.change < 0;
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
        <div className="rounded-md bg-muted p-1.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">
          {stat.value.toLocaleString()}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendIcon
            className={`h-3.5 w-3.5 ${isPositive ? "text-green-500" : isNegative ? "text-red-500" : ""}`}
          />
          <span
            className={
              isPositive
                ? "text-green-600 dark:text-green-400"
                : isNegative
                  ? "text-red-600 dark:text-red-400"
                  : ""
            }
          >
            {isPositive ? "+" : ""}
            {stat.change}%
          </span>
          <span>{stat.changeLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Growth area chart ────────────────────────────────────────────────────────

function GrowthChart({
  data,
  title,
  description,
  dataKey,
  color,
}: {
  data: ChartPoint[];
  title: string;
  description?: string;
  dataKey: string;
  color?: string;
}) {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color ?? "hsl(var(--chart-1))"} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color ?? "hsl(var(--chart-1))"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color ?? "hsl(var(--chart-1))"}
              strokeWidth={2}
              fill="url(#colorGrad)"
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Bar chart (weekly activity) ─────────────────────────────────────────────

function WeekBarChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
        />
        <Bar
          dataKey="events"
          fill="hsl(var(--chart-2))"
          radius={[4, 4, 0, 0]}
          isAnimationActive
          animationDuration={600}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────

function DonutChart({ data, title }: { data: PlanPoint[]; title: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{total} total</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                isAnimationActive
                animationDuration={800}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex w-full flex-col gap-1.5">
            {data.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="text-muted-foreground capitalize">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium tabular-nums">{item.value}</span>
                  {total > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round((item.value / total) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Activity feed ────────────────────────────────────────────────────────────

function activityLabel(item: ActivityItem) {
  const action = item.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const entity = item.entity_type ? item.entity_type.replace(/_/g, " ") : "";
  return `${action}${entity ? ` — ${entity}` : ""}`;
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

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        No recent activity
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3">
          <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
          <div className="flex-1 text-sm">
            <p className="font-medium leading-none">{activityLabel(item)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{timeAgo(item.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Recent tenants ───────────────────────────────────────────────────────────

function RecentTenantsList({ tenants }: { tenants: RecentTenant[] }) {
  if (tenants.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        No tenants yet
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {tenants.map((t) => (
        <div key={t.id} className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
            {t.name.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{t.name}</p>
            <p className="truncate text-xs text-muted-foreground">{t.domain}</p>
          </div>
          <Badge variant="secondary" className="capitalize text-xs">
            {t.plan}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ─── Content breakdown (tenant view) ─────────────────────────────────────────

function ContentBreakdown({ summary }: { summary: DashboardData["summary"] }) {
  const items = [
    {
      label: "Published Pages",
      value: summary.publishedPages,
      total: Math.max(summary.totalPages, 1),
    },
    {
      label: "Draft Pages",
      value: summary.totalPages - summary.publishedPages,
      total: Math.max(summary.totalPages, 1),
    },
    {
      label: "Media Files",
      value: summary.totalMedia,
      total: Math.max(summary.totalMedia, 1),
    },
  ];
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium tabular-nums">{item.value}</span>
          </div>
          <Progress
            value={Math.round((item.value / item.total) * 100)}
            className="h-1.5"
          />
        </div>
      ))}
      {summary.totalStorageMb > 0 && (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Storage used: </span>
          <span className="font-medium">{summary.totalStorageMb} MB</span>
        </div>
      )}
    </div>
  );
}

// ─── DashboardLayout ─────────────────────────────────────────────────────────

export interface DashboardLayoutProps {
  tenantIdOverride?: number;
  // kept for backward compat
  modules?: unknown;
}

export function DashboardLayout({ tenantIdOverride }: DashboardLayoutProps) {
  const { tenantId: contextTenantId } = useTenantAdmin();
  const tenantId = tenantIdOverride ?? contextTenantId ?? undefined;
  const isPlatformView = contextTenantId === null && tenantIdOverride === undefined;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error ?? "Unknown error loading dashboard."}
      </div>
    );
  }

  const growthLabel = isPlatformView ? "Total Tenants Over Time" : "Total Pages Over Time";
  const growthDesc = isPlatformView
    ? "Cumulative tenant count — last 30 days"
    : "Cumulative page count — last 30 days";

  return (
    <div className="space-y-6">
      {/* ── KPI stat cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data.stats.map((stat) => (
          <StatCardWidget key={stat.id} stat={stat} />
        ))}
      </div>

      {/* ── Charts row ────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-7">
        <GrowthChart
          data={data.charts.growth}
          title={growthLabel}
          description={growthDesc}
          dataKey="total"
          color="hsl(var(--chart-1))"
        />
        <DonutChart
          data={data.charts.plans}
          title={isPlatformView ? "Plan Distribution" : "Subscription Status"}
        />
      </div>

      {/* ── Activity + contextual ─────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>Events over time</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="month">
              <TabsList className="mb-4">
                <TabsTrigger value="month">30 days</TabsTrigger>
                <TabsTrigger value="week">7 days</TabsTrigger>
              </TabsList>
              <TabsContent value="month">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart
                    data={data.charts.activity}
                    margin={{ top: 0, right: 0, left: -30, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="events"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      fill="url(#actGrad)"
                      dot={false}
                      isAnimationActive
                      animationDuration={600}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="week">
                <WeekBarChart data={data.charts.week} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{isPlatformView ? "Recent Tenants" : "Content Overview"}</CardTitle>
            <CardDescription>
              {isPlatformView ? "Newly added tenants" : "Pages, media & storage"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPlatformView ? (
              <RecentTenantsList tenants={data.recentTenants} />
            ) : (
              <ContentBreakdown summary={data.summary} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent activity feed ─────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest audit log entries</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed items={data.recentActivity} />
        </CardContent>
      </Card>
    </div>
  );
}
