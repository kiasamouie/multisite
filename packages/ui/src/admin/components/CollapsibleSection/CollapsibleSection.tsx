"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../../../lib/cn";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  variant?: "default" | "nav";
}

export function CollapsibleSection({ title, children, defaultOpen = false, open: controlledOpen, onOpenChange, className, variant = "default" }: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const toggle = () => {
    if (isControlled) {
      onOpenChange?.(!open);
    } else {
      setInternalOpen(o => !o);
    }
  };

  if (variant === "nav") {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center justify-between rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <span>{title}</span>
          <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", !open && "-rotate-90")} />
        </button>
        {open && <div className="mt-0.5">{children}</div>}
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-1.5 text-sm font-semibold w-full text-left hover:text-primary transition-colors"
      >
        {open
          ? <ChevronDown className="h-4 w-4 shrink-0" />
          : <ChevronRight className="h-4 w-4 shrink-0" />
        }
        {title}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
