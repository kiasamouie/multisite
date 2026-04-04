"use client";

import { useEffect, type ReactNode } from "react";

export type SidePanelWidth = "sm" | "md" | "lg";

const WIDTH_CLASS: Record<SidePanelWidth, string> = {
  sm: "w-80",
  md: "w-[28rem]",
  lg: "w-[40rem]",
};

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  width?: SidePanelWidth;
  children: ReactNode;
}

export function SidePanel({
  isOpen,
  onClose,
  title,
  width = "md",
  children,
}: SidePanelProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-screen flex-col border-l border-border bg-background shadow-2xl transition-transform duration-250 ease-in-out ${WIDTH_CLASS[width]} ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Sticky header */}
        <div className="flex shrink-0 items-start justify-between border-b border-border px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
          </div>
          <button
            onClick={onClose}
            title="Close"
            className="ml-4 shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </aside>
    </>
  );
}
