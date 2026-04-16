import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";

export interface ReadOnlyFieldProps {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function ReadOnlyField({ label, value, children, className }: ReadOnlyFieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{children ?? value ?? "—"}</div>
    </div>
  );
}
