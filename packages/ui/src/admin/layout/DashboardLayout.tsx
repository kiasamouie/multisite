"use client";

import { useState, Fragment } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "../../components/ui/sidebar";
import { Separator } from "../../components/ui/separator";
import { Button } from "../../components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "../theme/ThemeToggle";
import { Bell, Search, ExternalLink, Plus, LogOut, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import type { NavItem } from "@repo/lib/config/dashboardConfig";

export interface DashboardLayoutProps {
  navItems: NavItem[];
  header: { title: string; subtitle?: string; initial?: string };
  userEmail: string;
  userName?: string;
  signOutHref: string;
  siteUrl?: string;
  isSuperAdmin?: boolean;
  /** Primary action label for the topbar gradient CTA button (e.g. "New Tenant") */
  primaryActionLabel?: string;
  /** href for the topbar CTA button */
  primaryActionHref?: string;
  children: React.ReactNode;
}

/** Maps URL path segments to display labels using the navItems config */
function useBreadcrumbs(navItems: NavItem[]) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  if (segments[0] === "admin") {
    crumbs.push({ label: "Admin", href: "/admin" });
  }

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const fullPath = "/" + segments.slice(0, i + 1).join("/");
    // Search flat items and children
    let match = navItems.find(
      (n) => n.href === fullPath || n.href === `/${seg}`,
    );
    if (!match) {
      for (const item of navItems) {
        match = item.children?.find(
          (c) => c.href === fullPath || c.href === `/${seg}`,
        );
        if (match) break;
      }
    }
    const label = match?.label ?? seg.charAt(0).toUpperCase() + seg.slice(1);
    crumbs.push({ label, href: fullPath });
  }

  return crumbs;
}

export function DashboardLayout({
  navItems,
  header,
  userEmail,
  userName,
  signOutHref,
  siteUrl,
  isSuperAdmin,
  primaryActionLabel,
  primaryActionHref,
  children,
}: DashboardLayoutProps) {
  const breadcrumbs = useBreadcrumbs(navItems);

  return (
    <SidebarProvider data-admin-shell="true">
      <AppSidebar
        navItems={navItems}
        header={header}
        userEmail={userEmail}
        userName={userName}
        signOutHref={signOutHref}
        siteUrl={siteUrl}
        isSuperAdmin={isSuperAdmin}
      />
      <SidebarInset>
        {/* ── Kinetic top header bar ─────────────────────────────────── */}
        <header className="admin-header sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 px-4">
          {/* Left: toggle + breadcrumbs */}
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="h-4 opacity-40" />
          </div>

          <div className="hidden md:flex">
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, i) => {
                  const isLast = i === breadcrumbs.length - 1;
                  return (
                    <Fragment key={crumb.href}>
                      {i > 0 && <BreadcrumbSeparator className="opacity-40" />}
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage className="font-medium">
                            {crumb.label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link
                              href={crumb.href}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {crumb.label}
                            </Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: utilities */}
          <div className="flex items-center gap-1">
            {/* Search icon → opens command palette via ⌘K */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Search (⌘K)"
              onClick={() => {
                // Dispatch keyboard event to trigger command palette 
                const e = new KeyboardEvent("keydown", {
                  key: "k",
                  metaKey: true,
                  ctrlKey: false,
                  bubbles: true,
                });
                document.dispatchEvent(e);
              }}
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Notification bell */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>

            {/* View Site (tenant context) */}
            {siteUrl && siteUrl !== "/" && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground sm:flex"
                asChild
              >
                <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Site
                </a>
              </Button>
            )}

            <ThemeToggle />

            {/* User menu dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 px-2"
                >
                  <Avatar className="h-6 w-6 rounded-md bg-primary/20">
                    <AvatarFallback className="rounded-md bg-primary/20 text-primary text-xs font-bold">
                      {(userName ?? userEmail).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left text-xs leading-tight sm:grid">
                    <span className="truncate font-medium">
                      {userName ?? userEmail}
                    </span>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-xl"
                side="bottom"
                align="end"
                sideOffset={8}
              >
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-xs text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
                <DropdownMenuSeparator />
                {isSuperAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <a
                        href={`${process.env.NEXT_PUBLIC_PLATFORM_URL ?? ""}/admin`}
                        className="cursor-pointer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Global Admin
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href={signOutHref} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Gradient primary action CTA */}
            {primaryActionLabel && (
              <Button
                size="sm"
                className="btn-kinetic ml-1 h-8 gap-1.5 text-xs font-medium"
                asChild={!!primaryActionHref}
              >
                {primaryActionHref ? (
                  <Link href={primaryActionHref}>
                    <Plus className="h-3.5 w-3.5" />
                    {primaryActionLabel}
                  </Link>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    {primaryActionLabel}
                  </>
                )}
              </Button>
            )}
          </div>
        </header>

        {/* ── Main content ───────────────────────────────────────────── */}
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
