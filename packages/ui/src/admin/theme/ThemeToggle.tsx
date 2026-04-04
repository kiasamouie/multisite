"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

/**
 * Cycles through system → light → dark.
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

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const title = theme === "light" ? "Light mode (click for dark)" : theme === "dark" ? "Dark mode (click for system)" : "System theme (click for light)";

  return (
    <button
      onClick={cycle}
      title={title}
      className={`flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/5 hover:text-foreground ${className ?? ""}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
