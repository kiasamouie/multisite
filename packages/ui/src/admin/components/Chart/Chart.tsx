"use client";

/**
 * Generic Chart component — renders area, bar, or donut charts.
 * Uses recharts v2 API (compatible with multisite's recharts 2.15.4).
 */
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "hsl(275, 100%, 80%)",  // primary — purple
  "hsl(187, 95%, 60%)",   // secondary — cyan
  "hsl(326, 100%, 75%)",  // tertiary — pink
  "hsl(100, 39%, 68%)",   // success — green
  "hsl(349, 100%, 72%)",  // error — red
];

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "hsl(280, 4%, 10%)",
  border: "1px solid hsl(270, 3%, 28%)",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(0, 0%, 96%)",
};

const AXIS_TICK = { fill: "hsl(0, 0%, 67%)", fontSize: 11 };

export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
}

interface AreaBarProps {
  type: "area" | "bar";
  data: Record<string, unknown>[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
}

interface DonutProps {
  type: "donut";
  data: Record<string, unknown>[];
  dataKey: string;
  nameKey: string;
  centerLabel?: string;
  centerSub?: string;
  height?: number;
  showLegend?: boolean;
}

export type ChartProps = AreaBarProps | DonutProps;

function AreaBarChart({ type, data, xKey, series, height = 260, showLegend }: AreaBarProps) {
  const ChartComponent = type === "area" ? AreaChart : BarChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent data={data}>
        <defs>
          {type === "area" &&
            series.map((s, i) => {
              const color = s.color ?? CHART_COLORS[i % CHART_COLORS.length]!;
              return (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              );
            })}
        </defs>
        <XAxis dataKey={xKey} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={32} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: "hsl(0, 0%, 67%)" }} />}
        {series.map((s, i) => {
          const color = s.color ?? CHART_COLORS[i % CHART_COLORS.length]!;
          if (type === "area") {
            return (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${s.key})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            );
          }
          return (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={color}
              radius={[4, 4, 0, 0]}
            />
          );
        })}
      </ChartComponent>
    </ResponsiveContainer>
  );
}

function DonutChartInner({
  data,
  dataKey,
  nameKey,
  centerLabel,
  centerSub,
  height = 260,
  showLegend,
}: Omit<DonutProps, "type">) {
  const outerRadius = Math.floor(height / 2) - 20;
  const innerRadius = Math.floor(outerRadius * 0.65);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              outerRadius={outerRadius}
              innerRadius={innerRadius}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>

        {(centerLabel || centerSub) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            {centerLabel && (
              <span className="text-[22px] font-extrabold leading-tight text-foreground">
                {centerLabel}
              </span>
            )}
            {centerSub && (
              <span className="text-[11px] text-muted-foreground">
                {centerSub}
              </span>
            )}
          </div>
        )}
      </div>

      {showLegend && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="text-xs text-muted-foreground">
                {String(d[nameKey])}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Chart(props: ChartProps) {
  if (props.type === "donut") {
    const { type: _type, ...rest } = props;
    return <DonutChartInner {...rest} />;
  }
  return <AreaBarChart {...props} />;
}
