import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { cn } from "../../../lib/cn";

export interface InfoCardProps {
  title?: string | ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  variant?: "default" | "panel";
  value?: string | number | null;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: string;
  trendLabel?: string;
  trendUp?: boolean;
}

export function InfoCard({
  title,
  subtitle,
  actions,
  children,
  className,
  variant = "default",
  value,
  icon: Icon,
  iconColor,
  trend,
  trendLabel,
  trendUp,
}: InfoCardProps) {
  /* ── Panel variant ───────────────────────────────────────────────── */
  if (variant === "panel") {
    return (
      <Card className={cn("overflow-hidden", className)}>
        {title && (
          <CardHeader className="px-5 py-4 border-b border-[hsl(var(--outline-variant)/0.1)]">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{title}</CardTitle>
          </CardHeader>
        )}
        {children}
      </Card>
    );
  }

  const isMetric = value !== undefined;

  if (isMetric) {
    const isUp =
      trendUp !== undefined
        ? trendUp
        : typeof trend === "string"
          ? !trend.startsWith("-")
          : true;
    const TrendIcon = isUp ? TrendingUp : TrendingDown;

    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {Icon && (
            <Icon className={cn("h-4 w-4", iconColor ?? "text-[hsl(var(--muted-foreground))]")} />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value ?? "—"}</div>
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  isUp
                    ? "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]"
                    : "bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]",
                )}
              >
                <TrendIcon className="h-2.5 w-2.5" />
                {trend}
              </span>
              {trendLabel && (
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{trendLabel}</span>
              )}
            </div>
          )}
          {subtitle && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{subtitle}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-sm font-bold">{title}</CardTitle>
          {subtitle && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </CardHeader>
      <CardContent className="flex-1 pt-0">{children}</CardContent>
    </Card>
  );
}

