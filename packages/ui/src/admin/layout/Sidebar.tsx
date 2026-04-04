"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  active?: boolean;
  badge?: string;
  id?: string; // For matching special cases like dashboard at root
}

interface SidebarProps {
  navItems: NavItem[];
  bottomNavItems?: NavItem[];
  header: { title: string; subtitle?: string; initial?: string };
  newItemLabel?: string;
  newItemHref?: string;
  siteUrl?: string;
}

function isNavItemActive(pathname: string, navItem: NavItem): boolean {
  // Exact match for root dashboard
  if (navItem.id === "dashboard" || navItem.id === "overview") {
    return pathname === navItem.href;
  }

  // Prefix match for other routes
  return pathname.startsWith(navItem.href);
}

export function Sidebar({
  navItems,
  bottomNavItems,
  header,
  newItemLabel,
  newItemHref,
  siteUrl,
}: SidebarProps) {
  const pathname = usePathname();
  console.log("siteUrl", siteUrl);
  // Compute active state for each nav item based on current pathname
  const enrichedNavItems = useMemo(() => {
    return navItems.map((item) => ({
      ...item,
      active: isNavItemActive(pathname, item),
    }));
  }, [navItems, pathname]);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-[hsl(var(--admin-border))]/20 bg-[hsl(var(--admin-surface))] shadow-[24px_0_48px_-12px_rgba(0,0,0,0.5)]">
      <div className="p-6">
        {/* Logo / Brand */}
        {siteUrl ? (
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-8 flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[hsl(var(--admin-border))]/20 bg-[hsl(var(--admin-surface-bright))]">
              <span className="text-xl font-bold tracking-tighter text-primary">
                {header.initial ?? header.title.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tighter text-primary">{header.title}</h2>
              {header.subtitle && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {header.subtitle}
                </p>
              )}
            </div>
          </a>
        ) : (
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[hsl(var(--admin-border))]/20 bg-[hsl(var(--admin-surface-bright))]">
              <span className="text-xl font-bold tracking-tighter text-primary">
                {header.initial ?? header.title.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tighter text-primary">{header.title}</h2>
              {header.subtitle && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {header.subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="space-y-1">
          {enrichedNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                item.active
                  ? "translate-x-1 border-r-2 border-primary bg-[hsl(var(--admin-surface-bright))] text-primary"
                  : "text-slate-400 hover:bg-[hsl(var(--admin-surface-raised))] hover:text-slate-200"
              }`}
            >
              <span className="material-symbols-outlined" style={item.active ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {item.icon ?? "circle"}
              </span>
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* New Item Button */}
        {newItemLabel && newItemHref && (
          <div className="mt-8 px-4">
            <Link
              href={newItemHref}
              className="block w-full rounded-md bg-gradient-to-br from-primary to-[hsl(239,84%,66%)] py-2.5 text-center text-sm font-bold text-white shadow-lg shadow-primary/10 transition-opacity hover:opacity-90"
            >
              {newItemLabel}
            </Link>
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="mt-auto w-full border-t border-[hsl(var(--admin-border))]/10 p-6">
        {bottomNavItems && bottomNavItems.length > 0 && (
          <nav className="mb-6 space-y-1">
            {bottomNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
              >
                <span className="material-symbols-outlined text-sm">{item.icon ?? "circle"}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>
    </aside>
  );
}
