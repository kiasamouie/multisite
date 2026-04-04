"use client";

import { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Line, Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChartType = "line" | "bar" | "pie";
export type ChartMetric = "growth" | "plans" | "storage" | "activity";
export type ChartPeriod = "week" | "month" | "year";

export interface MetricChartProps {
  /** Visual chart type */
  type: ChartType;
  /** Which data metric to load */
  metric: ChartMetric;
  /** Scope to a specific tenant; omit for platform-wide view */
  tenantId?: number;
  /** Time window for time-series metrics */
  period?: ChartPeriod;
  /** Override the default chart title */
  title?: string;
  /** Height in pixels (default 220) */
  height?: number;
}

interface ChartPayload {
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

// ─── Default titles ───────────────────────────────────────────────────────────

const DEFAULT_TITLES: Record<ChartMetric, string> = {
  growth: "Growth Over Time",
  plans: "Plan Distribution",
  storage: "Storage / Media Usage",
  activity: "Activity by Event Type",
};

// ─── Colour palettes ──────────────────────────────────────────────────────────

const LINE_COLORS = [
  { border: "rgb(99,102,241)", bg: "rgba(99,102,241,0.15)" },
  { border: "rgb(34,197,94)", bg: "rgba(34,197,94,0.15)" },
];

const BAR_COLORS = [
  "rgba(99,102,241,0.7)",
  "rgba(34,197,94,0.7)",
  "rgba(251,191,36,0.7)",
  "rgba(239,68,68,0.7)",
  "rgba(14,165,233,0.7)",
  "rgba(168,85,247,0.7)",
  "rgba(249,115,22,0.7)",
  "rgba(20,184,166,0.7)",
];

const PIE_COLORS = [
  "rgba(99,102,241,0.8)",
  "rgba(34,197,94,0.8)",
  "rgba(251,191,36,0.8)",
  "rgba(239,68,68,0.8)",
];

// ─── Chart-specific option presets ───────────────────────────────────────────

const BASE_OPTIONS: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: "rgb(148,163,184)", font: { size: 12 } },
    },
    tooltip: {
      backgroundColor: "rgba(15,23,42,0.9)",
      titleColor: "rgb(226,232,240)",
      bodyColor: "rgb(148,163,184)",
      borderColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
    },
  },
};

const LINE_OPTIONS: ChartOptions<"line"> = {
  ...(BASE_OPTIONS as ChartOptions<"line">),
  scales: {
    x: {
      ticks: { color: "rgb(100,116,139)", maxTicksLimit: 8, font: { size: 11 } },
      grid: { color: "rgba(255,255,255,0.04)" },
    },
    y: {
      ticks: { color: "rgb(100,116,139)", font: { size: 11 } },
      grid: { color: "rgba(255,255,255,0.04)" },
      beginAtZero: true,
    },
  },
};

const BAR_OPTIONS: ChartOptions<"bar"> = {
  ...(BASE_OPTIONS as ChartOptions<"bar">),
  scales: {
    x: {
      ticks: { color: "rgb(100,116,139)", font: { size: 11 } },
      grid: { color: "transparent" },
    },
    y: {
      ticks: { color: "rgb(100,116,139)", font: { size: 11 } },
      grid: { color: "rgba(255,255,255,0.04)" },
      beginAtZero: true,
    },
  },
};

// ─── Transform raw payload into Chart.js dataset ──────────────────────────────

function buildChartData(type: ChartType, payload: ChartPayload): ChartData<typeof type> {
  if (type === "line") {
    return {
      labels: payload.labels,
      datasets: payload.datasets.map((ds, i) => ({
        label: ds.label,
        data: ds.data,
        borderColor: LINE_COLORS[i % LINE_COLORS.length]!.border,
        backgroundColor: LINE_COLORS[i % LINE_COLORS.length]!.bg,
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.4,
        fill: true,
      })),
    } as ChartData<"line">;
  }

  if (type === "bar") {
    return {
      labels: payload.labels,
      datasets: payload.datasets.map((ds) => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: ds.data.map((_, i) => BAR_COLORS[i % BAR_COLORS.length]!),
        borderRadius: 4,
      })),
    } as ChartData<"bar">;
  }

  // pie
  return {
    labels: payload.labels,
    datasets: payload.datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: PIE_COLORS,
      borderColor: "rgba(15,23,42,0.6)",
      borderWidth: 2,
    })),
  } as ChartData<"pie">;
}

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
  // Re-key chart instance when data changes to prevent Canvas reuse issues
  const keyRef = useRef(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ metric, period });
    if (tenantId != null) params.set("tenantId", String(tenantId));

    fetch(`/api/admin/metrics/chart?${params}`)
      .then((r) => (r.ok ? r.json() : r.json().then((e: { error?: string }) => Promise.reject(e.error ?? "Failed"))))
      .then((d: ChartPayload) => {
        keyRef.current += 1;
        setPayload(d);
        setLoading(false);
      })
      .catch((e: unknown) => { setError(String(e)); setLoading(false); });
  }, [metric, tenantId, period]);

  const chartTitle = title ?? DEFAULT_TITLES[metric];
  const chartData = payload ? buildChartData(type, payload) : null;

  return (
    <div className="rounded-xl border border-white/5 bg-[hsl(var(--admin-surface))] p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">{chartTitle}</h3>

      {loading && (
        <div className="flex items-center justify-center" style={{ height }}>
          <span className="text-sm text-slate-500">Loading…</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && chartData && (
        <div style={{ height }}>
          {type === "line" && (
            <Line
              key={keyRef.current}
              data={chartData as ChartData<"line">}
              options={LINE_OPTIONS}
            />
          )}
          {type === "bar" && (
            <Bar
              key={keyRef.current}
              data={chartData as ChartData<"bar">}
              options={BAR_OPTIONS}
            />
          )}
          {type === "pie" && (
            <Pie
              key={keyRef.current}
              data={chartData as ChartData<"pie">}
              options={BASE_OPTIONS as ChartOptions<"pie">}
            />
          )}
        </div>
      )}
    </div>
  );
}
