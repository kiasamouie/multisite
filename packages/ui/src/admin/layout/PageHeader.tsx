import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";

export interface BreadcrumbItem_ {
  label: string;
  href?: string;
}

export interface StatusChip {
  label: string;
  /** "status" shows a pulsing dot + green text; "metric" shows large number */
  variant: "status" | "metric";
  value: string;
  trend?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem_[];
  chips?: StatusChip[];
}

export function PageHeader({
  title,
  subtitle,
  action,
  breadcrumbs,
  chips,
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb className="mb-2">
            <BreadcrumbList>
              {breadcrumbs.map((crumb, i) => (
                <BreadcrumbItem key={i}>
                  {i > 0 && <BreadcrumbSeparator />}
                  {crumb.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Status chips (backward compat) */}
        {chips &&
          chips.length > 0 &&
          chips.map((chip) => (
            <div
              key={chip.label}
              className="flex min-w-[140px] items-center gap-3 rounded-lg border border-border/50 bg-muted/50 p-3"
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {chip.label}
                </span>
                {chip.variant === "status" ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      {chip.value}
                    </span>
                  </div>
                ) : (
                  <span className="mt-1 text-xl font-extrabold text-foreground">
                    {chip.value}
                    {chip.trend && (
                      <span className="ml-1 text-xs font-medium text-green-600 dark:text-green-400">
                        {chip.trend}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          ))}
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
