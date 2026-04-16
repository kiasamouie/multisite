import { AlertTriangle, Check } from "lucide-react";
import { cn } from "../../../lib/cn";

export interface AlertBannerProps {
  variant: "error" | "success";
  title?: string;
  message?: string;
}

export function AlertBanner({ variant, title, message }: AlertBannerProps) {
  const isError = variant === "error";

  return (
    <div
      className={cn(
        "border-l-4 p-5 rounded-r-2xl flex items-start gap-4",
        isError
          ? "bg-destructive/5 border-destructive"
          : "bg-[hsl(var(--success)/0.05)] border-[hsl(var(--success))]",
      )}
    >
      <div
        className={cn(
          "p-2 rounded-lg shrink-0",
          isError ? "bg-destructive/15" : "bg-[hsl(var(--success)/0.15)]",
        )}
      >
        {isError
          ? <AlertTriangle className="h-5 w-5 text-destructive" />
          : <Check className="h-5 w-5 text-[hsl(var(--success))]" />}
      </div>
      <div className="space-y-1">
        {title && (
          <h4 className={cn("font-bold tracking-tight", isError ? "text-destructive" : "text-[hsl(var(--success))]")}>
            {title}
          </h4>
        )}
        {message && (
          <p className={cn("font-mono text-sm whitespace-pre-wrap", isError ? "text-foreground" : "text-muted-foreground")}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
