"use client";

import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
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
  Users,
  MessageSquare,
  Briefcase,
  PenLine,
  Calendar,
  CalendarCheck,
  BookOpen,
  LayoutTemplate,
  PanelTop,
  ChevronRight,
  Palette,
  Navigation,
  Search,
  Code2,
  SlidersHorizontal,
  Shield,
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
  "users": Users,
  "message-square": MessageSquare,
  "briefcase": Briefcase,
  "pen-line": PenLine,
  "calendar": Calendar,
  "calendar-check": CalendarCheck,
  "book-open": BookOpen,
  "layout-template": LayoutTemplate,
  "panel-top": PanelTop,
  "palette": Palette,
  "navigation": Navigation,
  "search": Search,
  "code-2": Code2,
  "sliders-horizontal": SlidersHorizontal,
  "shield": Shield,
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

  // Auto-open groups whose children include the current path, or when AT the parent href
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const item of navItems) {
      if (
        item.children?.some((c) => pathname.startsWith(c.href)) ||
        (item.children?.length && pathname === item.href)
      ) {
        initial.add(item.id);
      }
    }
    return initial;
  });

  // Keep groups open when pathname changes to a child or parent
  useEffect(() => {
    for (const item of navItems) {
      if (
        item.children?.some((c) => pathname.startsWith(c.href)) ||
        (item.children?.length && pathname === item.href)
      ) {
        setOpenGroups((prev) => {
          if (prev.has(item.id)) return prev;
          const next = new Set(prev);
          next.add(item.id);
          return next;
        });
      }
    }
  }, [pathname, navItems]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
                // Items with children render as collapsible groups whose
                // parent label is ALSO a link (navigates to item.href).
                // The chevron SidebarMenuAction handles expand/collapse only.
                if (item.children && item.children.length > 0) {
                  const isParentExact = pathname === item.href;
                  const isChildActive = item.children.some((c) =>
                    pathname.startsWith(c.href),
                  );
                  const isGroupActive = isParentExact || isChildActive;
                  const isOpen = openGroups.has(item.id);
                  const Icon = item.icon ? ICON_MAP[item.icon] : undefined;

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={isGroupActive}
                        tooltip={item.label}
                        onClick={() => toggleGroup(item.id)}
                        className={cn(
                          "rounded-lg transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                          isGroupActive &&
                            "border-l-2 border-primary bg-sidebar-accent text-sidebar-primary font-medium",
                        )}
                      >
                        {Icon && (
                          <Icon
                            className={cn(
                              "h-4 w-4 transition-colors duration-200",
                              isGroupActive
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          />
                        )}
                        <span>{item.label}</span>
                        <ChevronRight
                          className={cn(
                            "ml-auto h-4 w-4 transition-transform duration-200",
                            isOpen && "rotate-90",
                          )}
                        />
                      </SidebarMenuButton>
                      {isOpen && (
                        <SidebarMenuSub>
                          {item.children.map((child) => {
                            const childActive = pathname.startsWith(child.href);
                            const ChildIcon = child.icon
                              ? ICON_MAP[child.icon]
                              : undefined;
                            return (
                              <SidebarMenuSubItem key={child.id}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={childActive}
                                >
                                  <Link href={child.href}>
                                    {ChildIcon && (
                                      <ChildIcon
                                        className={cn(
                                          "h-3.5 w-3.5 transition-colors duration-200",
                                          childActive
                                            ? "text-primary"
                                            : "text-muted-foreground",
                                        )}
                                      />
                                    )}
                                    <span>{child.label}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                }

                // Regular flat nav items
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
