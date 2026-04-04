"use client";

import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "../theme/ThemeToggle";

export interface TopBarTab {
  label: string;
  href: string;
  active?: boolean;
}

export interface TopBarContextChip {
  label: string;
  initials?: string;
}

interface TopBarProps {
  searchPlaceholder?: string;
  /** Called with the current input value on every keystroke */
  onSearch?: (query: string) => void;
  /** Tabs shown next to search (e.g. Platform | Logs | Support) */
  tabs?: TopBarTab[];
  /** Context chip on the right (e.g. "Global System") */
  context?: TopBarContextChip;
  /** User email for profile */
  userEmail?: string;
  /** User display name */
  userName?: string;
  /** Sign out link */
  signOutHref?: string;
  /** Whether the user is a super admin */
  isSuperAdmin?: boolean;
}

export function TopBar({ searchPlaceholder, onSearch, tabs, context, userEmail, userName, signOutHref, isSuperAdmin }: TopBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[hsl(var(--admin-border))]/20 bg-[hsl(var(--admin-surface))]/80 px-8 backdrop-blur-xl font-['Inter'] text-sm font-medium">
      {/* Left: search + tabs */}
      <div className="flex items-center gap-8">
        <div className="group relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 transition-colors group-focus-within:text-primary">
            <span className="material-symbols-outlined text-lg">search</span>
          </span>
          <input
            type="text"
            placeholder={searchPlaceholder ?? "Search..."}
            onChange={(e) => onSearch?.(e.target.value)}
            className="w-64 rounded-lg border-none bg-[hsl(var(--admin-surface-raised))] py-1.5 pl-10 pr-4 text-sm text-foreground placeholder:text-slate-600 transition-all focus:w-80 focus:border-primary focus:ring-0"
          />
        </div>
        {tabs && tabs.length > 0 && (
          <nav className="hidden items-center gap-6 lg:flex">
            {tabs.map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                className={
                  tab.active
                    ? "border-b border-primary pb-1 text-primary"
                    : "text-slate-400 transition-colors hover:text-primary"
                }
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Right: notifications + settings dropdown + context chip + user profile */}
      <div className="flex items-center gap-4">

        <button
          className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/5 hover:text-foreground"
          title="Notifications"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => {
              window.location.href = `${process.env.NEXT_PUBLIC_PLATFORM_URL}/admin`;
            }}
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/5 hover:text-foreground"
            title="Go to Global Admin"
          >
            <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
          </button>
        )}

        {/* Settings Dropdown */}
        <div className="relative">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/5 hover:text-foreground"
            title="Settings"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
          {settingsOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-[hsl(var(--admin-border))]/20 bg-[hsl(var(--admin-surface))] shadow-lg">
              <div className="space-y-1 p-1">
                <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-300">
                  <span>Theme</span>
                  <ThemeToggle />
                </div>
                <div className="border-t border-[hsl(var(--admin-border))]/20" />
                {userEmail && (
                  <Link
                    href="/admin/settings"
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 transition-colors hover:bg-white/5 hover:text-foreground rounded"
                    onClick={() => setSettingsOpen(false)}
                  >
                    <span className="material-symbols-outlined text-sm">settings</span>
                    <span>General Settings</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {context && (
          <>
            <div className="mx-2 h-8 w-px bg-[hsl(var(--admin-border))]/20" />
            <div className="flex items-center gap-3 rounded-lg border border-[hsl(var(--admin-border))]/20 bg-[hsl(var(--admin-surface-bright))]/50 px-3 py-1.5">
              {context.initials && (
                <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-[10px] font-bold text-primary-foreground">
                  {context.initials}
                </div>
              )}
              <span className="text-xs font-semibold text-foreground">{context.label}</span>
              <span className="material-symbols-outlined text-xs text-slate-500">expand_more</span>
            </div>
          </>
        )}
        {userEmail && (
          <>
            <div className="h-8 w-px bg-[hsl(var(--admin-border))]/20" />
            <div className="flex items-center gap-2">
              <Link
                href="/admin/settings"
                className="flex items-center gap-2 rounded-lg border border-transparent transition-colors hover:border-[hsl(var(--admin-border))]/40 hover:bg-[hsl(var(--admin-surface-bright))]/80 px-2 py-1"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-[hsl(var(--admin-surface-bright))] text-[10px] font-bold text-primary">
                  {(userName ?? userEmail).charAt(0).toUpperCase()}
                </div>
                <div className="hidden min-w-0 flex-col sm:flex">
                  <p className="truncate text-xs font-bold text-foreground">{userName ?? userEmail.split("@")[0]}</p>
                  <p className="truncate text-[10px] text-slate-500">{userEmail}</p>
                </div>
              </Link>
              {signOutHref && (
                <Link href={signOutHref} className="text-slate-500 transition-colors hover:text-slate-300" title="Sign out">
                  <span className="material-symbols-outlined text-sm">logout</span>
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
