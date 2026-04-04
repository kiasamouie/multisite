import Link from "next/link";

export interface Breadcrumb {
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
  breadcrumbs?: Breadcrumb[];
  chips?: StatusChip[];
}

export function PageHeader({ title, subtitle, breadcrumbs, chips }: PageHeaderProps) {
  return (
    <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      {/* Left */}
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.label} className="flex items-center gap-2">
                {i > 0 && (
                  <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                )}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-primary">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-primary">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-4xl font-extrabold leading-none tracking-tighter text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-xl font-medium text-slate-400">{subtitle}</p>
        )}
      </div>

      {/* Right — status chips */}
      {chips && chips.length > 0 && (
        <div className="flex gap-4">
          {chips.map((chip) => (
            <div
              key={chip.label}
              className="glass-panel flex min-w-[180px] items-center gap-4 rounded-lg border border-[hsl(var(--admin-border))]/10 p-4"
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {chip.label}
                </span>
                {chip.variant === "status" ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
                    <span className="text-sm font-bold text-secondary">{chip.value}</span>
                  </div>
                ) : (
                  <span className="mt-1 text-xl font-extrabold text-foreground">
                    {chip.value}
                    {chip.trend && (
                      <span className="ml-1 text-xs font-medium text-secondary">{chip.trend}</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
