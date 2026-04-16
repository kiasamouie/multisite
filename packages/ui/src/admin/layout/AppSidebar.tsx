"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
} from "../../components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  CreditCard,
  Image,
  FileText,
  Settings,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../lib/cn";
import type { NavItem } from "@repo/lib/config/dashboardConfig";

/** Maps icon string identifiers from dashboardConfig to Lucide components */
const ICON_MAP: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "globe": Globe,
  "credit-card": CreditCard,
  "image": Image,
  "file-text": FileText,
  "settings": Settings,
};

export interface AppSidebarProps {
  navItems: NavItem[];
  bottomNavItems?: NavItem[];
  header: { title: string; subtitle?: string; initial?: string };
  userEmail: string;
  userName?: string;
  signOutHref: string;
  siteUrl?: string;
  isSuperAdmin?: boolean;
}

/** Workspace identity block shown at the top of the sidebar */
function WorkspaceBlock({
  header,
}: {
  header: AppSidebarProps["header"];
}) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-sm font-bold text-primary">
        {header.initial ?? header.title.charAt(0)}
      </div>
      <div className="grid flex-1 text-left leading-tight">
        {/* Thin editorial weight for the workspace name */}
        <span className="truncate text-sm font-thin tracking-wide text-foreground">
          {header.title}
        </span>
        {header.subtitle && (
          <span className="truncate text-xs text-muted-foreground">
            {header.subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

export function AppSidebar({
  navItems,
  header,
  userEmail,
  userName,
  signOutHref,
  siteUrl,
  isSuperAdmin,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      {/* ── Workspace header ───────────────────────────────────────────── */}
      <SidebarHeader className="border-b border-sidebar-border/50 pb-3">
        {siteUrl ? (
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-80"
          >
            <WorkspaceBlock header={header} />
          </a>
        ) : (
          <WorkspaceBlock header={header} />
        )}
      </SidebarHeader>

      {/* ── Nav items ──────────────────────────────────────────────────── */}
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.id === "dashboard" || item.id === "overview"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                const Icon = item.icon ? ICON_MAP[item.icon] : undefined;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "rounded-lg transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                        isActive &&
                          "border-l-2 border-primary bg-sidebar-accent text-sidebar-primary font-medium",
                      )}
                    >
                      <Link href={item.href}>
                        {Icon && (
                          <Icon
                            className={cn(
                              "h-4 w-4 transition-colors duration-200",
                              isActive ? "text-primary" : "text-muted-foreground",
                            )}
                          />
                        )}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer (empty now that user menu moved to top nav) ──────────── */}
    </Sidebar>
  );
}
