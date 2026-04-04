"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "../../components/ui/sidebar";
import { Separator } from "../../components/ui/separator";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";
import { AppSidebar } from "../AppSidebar";
import { ThemeToggle } from "../theme/ThemeToggle";
import { Search, X, ExternalLink } from "lucide-react";
import type { NavItem } from "@repo/lib/config/dashboardConfig";

interface ShellProps {
  navItems: NavItem[];
  bottomNavItems?: NavItem[];
  header: { title: string; subtitle?: string; initial?: string };
  userEmail: string;
  userName?: string;
  signOutHref: string;
  siteUrl?: string;
  isSuperAdmin?: boolean;
  children: React.ReactNode;
  // Deprecated props kept for backward compat (no longer rendered)
  newItemLabel?: string;
  newItemHref?: string;
  topBarSearchPlaceholder?: string;
  topBarOnSearch?: (query: string) => void;
}

/** Maps URL path segments to display labels using the navItems config */
function useBreadcrumbs(navItems: NavItem[]) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: { label: string; href: string }[] = [];

  // Always start with Admin / Dashboard
  if (segments[0] === "admin") {
    crumbs.push({ label: "Admin", href: "/admin" });
  }

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const fullPath = "/" + segments.slice(0, i + 1).join("/");

    // Try to find a label from navItems
    const match = navItems.find((n) =>
      n.href === fullPath || n.href === `/${seg}`,
    );
    const label = match?.label ?? seg.charAt(0).toUpperCase() + seg.slice(1);
    crumbs.push({ label, href: fullPath });
  }

  return crumbs;
}

export function Shell({
  navItems,
  bottomNavItems,
  header,
  userEmail,
  userName,
  signOutHref,
  siteUrl,
  isSuperAdmin,
  children,
}: ShellProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const breadcrumbs = useBreadcrumbs(navItems);
  const isActivePage = (href: string) => {
    // the last crumb is the current page — show it differently
    return breadcrumbs[breadcrumbs.length - 1]?.href === href;
  };

  return (
    <SidebarProvider>
      <AppSidebar
        navItems={navItems}
        bottomNavItems={bottomNavItems}
        header={header}
        userEmail={userEmail}
        userName={userName}
        signOutHref={signOutHref}
        siteUrl={siteUrl}
        isSuperAdmin={isSuperAdmin}
      />
      <SidebarInset>
        {/* ── Top toolbar ────────────────────────────────────────────────── */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
          </div>

          {/* Breadcrumbs */}
          <div className="hidden md:flex">
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, i) => {
                  const isLast = i === breadcrumbs.length - 1;
                  return (
                    <BreadcrumbItem key={crumb.href}>
                      {i > 0 && <BreadcrumbSeparator />}
                      {isLast ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search */}
          <div className="relative hidden w-64 sm:flex lg:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              className="h-8 rounded-sm pl-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* View Site (for tenant context) */}
          {siteUrl && siteUrl !== "/" && (
            <Button
              variant="outline"
              size="sm"
              className="hidden h-8 gap-1.5 text-xs sm:flex"
              asChild
            >
              <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
                View Site
              </a>
            </Button>
          )}

          {/* Theme toggle */}
          <ThemeToggle />
        </header>

        {/* ── Page content ───────────────────────────────────────────────── */}
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

