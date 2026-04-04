"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Cycles through system → light → dark.
 * Uses Material Symbols icons to match the admin panel aesthetic.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;

  const cycle = () => {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  };

  const icon = theme === "light" ? "light_mode" : theme === "dark" ? "dark_mode" : "brightness_auto";
  const title = theme === "light" ? "Light mode (click for dark)" : theme === "dark" ? "Dark mode (click for system)" : "System theme (click for light)";

  return (
    <button
      onClick={cycle}
      title={title}
      className={`flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/5 hover:text-foreground ${className ?? ""}`}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </button>
  );
}
