import { cn } from "../../../lib/cn";

export interface ProgressBarProps {
  value: number;
  variant?: "default" | "error";
  size?: "sm" | "default";
}

export function ProgressBar({ value, variant = "default", size = "default" }: ProgressBarProps) {
  return (
    <div
      className={cn(
        "bg-[hsl(var(--surface-highest))] rounded-full overflow-hidden",
        size === "sm" ? "h-1.5" : "h-2",
      )}
    >
      <div
        className={cn(
          "h-full rounded-full",
          size === "default" && "transition-all duration-500",
          size === "sm" && "transition-all",
          variant === "error"
            ? "bg-destructive"
            : "bg-gradient-to-r from-[hsl(var(--secondary))] to-[hsl(var(--primary))]",
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
