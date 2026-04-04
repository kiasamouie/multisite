// Backward compatibility re-export
import { Shell } from "./layout/Shell";
export type { NavItem } from "@repo/lib/config/dashboardConfig";
import type { NavItem } from "@repo/lib/config/dashboardConfig";

interface AdminSidebarProps {
  navItems: NavItem[];
  bottomNavItems?: NavItem[];
  header: { title: string; subtitle?: string; initial?: string };
  userEmail: string;
  userName?: string;
  signOutHref: string;
  newItemLabel?: string;
  newItemHref?: string;
  siteUrl?: string;
  isSuperAdmin?: boolean;
  children: React.ReactNode;
}

export function AdminSidebar({
  navItems,
  bottomNavItems,
  header,
  userEmail,
  userName,
  signOutHref,
  newItemLabel,
  newItemHref,
  siteUrl,
  isSuperAdmin,
  children,
}: AdminSidebarProps) {
  return (
    <Shell
      navItems={navItems}
      bottomNavItems={bottomNavItems}
      header={header}
      userEmail={userEmail}
      userName={userName}
      signOutHref={signOutHref}
      newItemLabel={newItemLabel}
      newItemHref={newItemHref}
      siteUrl={siteUrl}
      isSuperAdmin={isSuperAdmin}
    >
      {children}
    </Shell>
  );
}
