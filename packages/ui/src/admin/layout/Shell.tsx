"use client";

import { Sidebar, type NavItem } from "./Sidebar";
import { TopBar, type TopBarTab, type TopBarContextChip } from "./TopBar";

interface ShellProps {
  navItems: NavItem[];
  bottomNavItems?: NavItem[];
  header: { title: string; subtitle?: string; initial?: string };
  userEmail: string;
  userName?: string;
  signOutHref: string;
  newItemLabel?: string;
  newItemHref?: string;
  topBarSearchPlaceholder?: string;
  topBarOnSearch?: (query: string) => void;
  topBarTabs?: TopBarTab[];
  topBarContext?: TopBarContextChip;
  siteUrl?: string;
  isSuperAdmin?: boolean;
  children: React.ReactNode;
}

export function Shell({
  navItems,
  bottomNavItems,
  header,
  userEmail,
  userName,
  signOutHref,
  newItemLabel,
  newItemHref,
  topBarSearchPlaceholder,
  topBarOnSearch,
  topBarTabs,
  topBarContext,
  siteUrl,
  isSuperAdmin,
  children,
}: ShellProps) {
  return (
    <div className="flex h-screen font-[Inter] tracking-tight antialiased">
      <Sidebar
        navItems={navItems}
        bottomNavItems={bottomNavItems}
        header={header}
        newItemLabel={newItemLabel}
        newItemHref={newItemHref}
        siteUrl={siteUrl}
      />
      <div className="ml-64 flex-1 flex flex-col">
        <TopBar
          searchPlaceholder={topBarSearchPlaceholder}
          onSearch={topBarOnSearch}
          tabs={topBarTabs}
          context={topBarContext}
          userEmail={userEmail}
          userName={userName}
          signOutHref={signOutHref}
          isSuperAdmin={isSuperAdmin}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
