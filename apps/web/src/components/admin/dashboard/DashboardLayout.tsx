"use client";

import { Suspense } from "react";
import { MetricCard, type MetricCardProps } from "./MetricCard";
import { MetricChart, type MetricChartProps } from "./MetricChart";
import { useTenantAdmin } from "@/components/admin";

// ─── Module config types ──────────────────────────────────────────────────────

export type DashboardCardModule = {
  type: "card";
  id: string;
  context: MetricCardProps["context"];
  features?: MetricCardProps["features"];
  title?: string;
};

export type DashboardChartModule = {
  type: "chart";
  id: string;
  /** Chart visual type (maps to MetricChartProps.type) */
  chartType: MetricChartProps["type"];
  metric: MetricChartProps["metric"];
  period?: MetricChartProps["period"];
  title?: string;
  height?: number;
};

export type DashboardModule = DashboardCardModule | DashboardChartModule;

export interface DashboardLayoutProps {
  /** Optional module configuration — falls back to defaults based on view context */
  modules?: DashboardModule[];
  /** Override tenant scope; platform admins can view a specific tenant */
  tenantIdOverride?: number;
}

// ─── Default module configs per view context ──────────────────────────────────

const PLATFORM_MODULES: DashboardModule[] = [
  {
    id: "tenants-overview",
    type: "card",
    context: "tenants",
    features: { showPlanBreakdown: true, showTenantList: true },
    title: "Tenant Overview",
  },
  {
    id: "subscriptions-overview",
    type: "card",
    context: "subscriptions",
    features: { showStatusBreakdown: true },
    title: "Subscriptions Overview",
  },
  {
    id: "members-overview",
    type: "card",
    context: "members",
    features: { showRoleBreakdown: true },
    title: "Member Overview",
  },
  {
    id: "content-overview",
    type: "card",
    context: "content",
    features: { showPublishedCount: true, showBlocksCount: true, showMediaCount: true },
    title: "Content Overview",
  },
  {
    id: "activity-feed",
    type: "card",
    context: "activity",
    features: { showAuditLog: true },
    title: "Recent Activity",
  },
  {
    id: "growth-chart",
    type: "chart",
    metric: "growth",
    chartType: "line",
    period: "month",
    title: "New Tenants (30 days)",
  },
  {
    id: "plan-dist-chart",
    type: "chart",
    metric: "plans",
    chartType: "pie",
    title: "Plan Distribution",
  },
  {
    id: "storage-chart",
    type: "chart",
    metric: "storage",
    chartType: "bar",
    title: "Media Usage by Tenant",
  },
  {
    id: "activity-chart",
    type: "chart",
    metric: "activity",
    chartType: "bar",
    period: "week",
    title: "Events (7 days)",
  },
];

const TENANT_MODULES: DashboardModule[] = [
  {
    id: "content-overview",
    type: "card",
    context: "content",
    features: { showPublishedCount: true, showBlocksCount: true, showMediaCount: true },
    title: "Your Content",
  },
  {
    id: "members-overview",
    type: "card",
    context: "members",
    features: { showRoleBreakdown: true },
    title: "Your Team",
  },
  {
    id: "activity-feed",
    type: "card",
    context: "activity",
    features: { showAuditLog: true },
    title: "Recent Activity",
  },
  {
    id: "growth-chart",
    type: "chart",
    metric: "growth",
    chartType: "line",
    period: "month",
    title: "Pages Created (30 days)",
  },
  {
    id: "storage-chart",
    type: "chart",
    metric: "storage",
    chartType: "bar",
    period: "month",
    title: "Media Uploads (30 days)",
  },
  {
    id: "activity-chart",
    type: "chart",
    metric: "activity",
    chartType: "bar",
    period: "week",
    title: "Events (7 days)",
  },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ModuleSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-white/5 bg-[hsl(var(--admin-surface))] p-5">
      <div className="mb-4 h-3 w-1/3 rounded bg-white/10" />
      <div className="space-y-2">
        <div className="h-4 rounded bg-white/5" />
        <div className="h-4 w-4/5 rounded bg-white/5" />
        <div className="h-4 w-3/5 rounded bg-white/5" />
      </div>
    </div>
  );
}

// ─── DashboardLayout ──────────────────────────────────────────────────────────

export function DashboardLayout({ modules, tenantIdOverride }: DashboardLayoutProps) {
  const { tenantId: contextTenantId } = useTenantAdmin();
  const tenantId = tenantIdOverride ?? contextTenantId ?? undefined;
  const isPlatformView = contextTenantId === null && !tenantIdOverride;

  const resolvedModules = modules ?? (isPlatformView ? PLATFORM_MODULES : TENANT_MODULES);

  // Separate cards and charts so cards render in a top grid and charts below
  const cardModules = resolvedModules.filter((m): m is DashboardCardModule => m.type === "card");
  const chartModules = resolvedModules.filter((m): m is DashboardChartModule => m.type === "chart");

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cardModules.map((mod) => (
          <Suspense key={mod.id} fallback={<ModuleSkeleton />}>
            <MetricCard
              context={mod.context}
              tenantId={tenantId}
              features={mod.features}
              title={mod.title}
            />
          </Suspense>
        ))}
      </div>

      {/* Charts */}
      {chartModules.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {chartModules.map((mod) => (
            <Suspense key={mod.id} fallback={<ModuleSkeleton />}>
              <MetricChart
                type={mod.chartType}
                metric={mod.metric}
                tenantId={tenantId}
                period={mod.period}
                title={mod.title}
                height={mod.height}
              />
            </Suspense>
          ))}
        </div>
      )}
    </div>
  );
}
