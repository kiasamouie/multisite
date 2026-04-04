"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Skeleton } from "@repo/ui/skeleton";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChartType = "line" | "bar" | "pie";
export type ChartMetric = "growth" | "plans" | "storage" | "activity";
export type ChartPeriod = "week" | "month" | "year";

export interface MetricChartProps {
  type: ChartType;
  metric: ChartMetric;
  tenantId?: number;
  period?: ChartPeriod;
  title?: string;
  height?: number;
}

interface ChartPayload {
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

const DEFAULT_TITLES: Record<ChartMetric, string> = {
  growth: "Growth Over Time",
  plans: "Plan Distribution",
  storage: "Storage / Media Usage",
  activity: "Activity by Event Type",
};

const COLORS = [
  "hsl(var(--chart-1, 221 83% 53%))",
  "hsl(var(--chart-2, 142 71% 45%))",
  "hsl(var(--chart-3, 47 96% 53%))",
  "hsl(var(--chart-4, 0 72% 51%))",
  "hsl(var(--chart-5, 262 83% 58%))",
];

// ─── MetricChart ──────────────────────────────────────────────────────────────

export function MetricChart({
  type,
  metric,
  tenantId,
  period = "month",
  title,
  height = 220,
}: MetricChartProps) {
  const [payload, setPayload] = useState<ChartPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ metric, period });
    if (tenantId != null) params.set("tenantId", String(tenantId));

    fetch(`/api/admin/metrics/chart?${params}`)
      .then((r) =>
        r.ok
          ? r.json()
          : r.json().then((e: { error?: string }) => Promise.reject(e.error ?? "Failed"))
      )
      .then((d: ChartPayload) => {
        setPayload(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(String(e));
        setLoading(false);
      });
  }, [metric, tenantId, period]);

  const chartTitle = title ?? DEFAULT_TITLES[metric];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>{chartTitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!payload) return null;

  // Transform payload into recharts-friendly data
  const rechartsData = payload.labels.map((label, i) => {
    const point: Record<string, string | number> = { name: label };
    payload.datasets.forEach((ds) => {
      point[ds.label] = ds.data[i] ?? 0;
    });
    return point;
  });

  const datasetKeys = payload.datasets.map((ds) => ds.label);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{chartTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {type === "line" || type === "bar" ? (
            type === "line" ? (
              <AreaChart data={rechartsData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "0.5rem",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                {datasetKeys.map((key, idx) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[idx % COLORS.length]}
                    fill={COLORS[idx % COLORS.length]}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            ) : (
              <BarChart data={rechartsData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "0.5rem",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                {datasetKeys.map((key, idx) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={COLORS[idx % COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            )
          ) : (
            <PieChart>
              <Pie
                data={rechartsData.map((d, i) => ({
                  name: d.name,
                  value: Number(d[datasetKeys[0] ?? ""] ?? 0),
                  fill: COLORS[i % COLORS.length],
                }))}
                cx="50%"
                cy="50%"
                outerRadius={height / 3}
                dataKey="value"
                label={({ name, percent }: { name: string; percent: number }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {rechartsData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "0.5rem",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                }}
              />
            </PieChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
