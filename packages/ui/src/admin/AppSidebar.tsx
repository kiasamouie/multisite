"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
} from "../components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronsUpDown,
  LogOut,
  ExternalLink,
  LayoutDashboard,
  Globe,
  CreditCard,
  Image,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "./theme/ThemeToggle";
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

interface AppSidebarProps {
  navItems: NavItem[];
  bottomNavItems?: NavItem[];
  header: { title: string; subtitle?: string; initial?: string };
  userEmail: string;
  userName?: string;
  signOutHref: string;
  siteUrl?: string;
  isSuperAdmin?: boolean;
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
      <SidebarHeader>
        {siteUrl ? (
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-80"
          >
            <div className="flex items-center gap-2 px-2 py-1">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                  {header.initial ?? header.title.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{header.title}</span>
                {header.subtitle && (
                  <span className="truncate text-xs text-muted-foreground">
                    {header.subtitle}
                  </span>
                )}
              </div>
            </div>
          </a>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                {header.initial ?? header.title.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{header.title}</span>
              {header.subtitle && (
                <span className="truncate text-xs text-muted-foreground">
                  {header.subtitle}
                </span>
              )}
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
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
                    >
                      <Link href={item.href}>
                        {Icon && <Icon />}
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {(userName ?? userEmail).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {userName ?? userEmail}
                    </span>
                    {userName && (
                      <span className="truncate text-xs text-muted-foreground">
                        {userEmail}
                      </span>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
