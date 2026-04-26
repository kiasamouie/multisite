import { cn } from "../../../lib/cn";

interface StatusConfig {
  bg: string;
  text: string;
  border: string;
  glow: string;
  pulse?: boolean;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  running:   { bg: "bg-[hsl(var(--secondary)/0.1)]",    text: "text-[hsl(var(--secondary))]",    border: "border-[hsl(var(--secondary)/0.2)]",    glow: "shadow-[0_0_12px_hsl(var(--secondary)/0.2)]",    pulse: true },
  pending:   { bg: "bg-[hsl(var(--warning)/0.1)]",      text: "text-[hsl(var(--warning))]",      border: "border-[hsl(var(--warning)/0.2)]",      glow: "shadow-[0_0_12px_hsl(var(--warning)/0.2)]",      pulse: true },
  active:    { bg: "bg-[hsl(var(--secondary)/0.1)]",    text: "text-[hsl(var(--secondary))]",    border: "border-[hsl(var(--secondary)/0.2)]",    glow: "shadow-[0_0_12px_hsl(var(--secondary)/0.2)]",    pulse: true },
  online:    { bg: "bg-[hsl(var(--success)/0.1)]",      text: "text-[hsl(var(--success))]",      border: "border-[hsl(var(--success)/0.2)]",      glow: "shadow-[0_0_12px_hsl(var(--success)/0.2)]",      pulse: true },
  enabled:   { bg: "bg-[hsl(var(--success)/0.1)]",      text: "text-[hsl(var(--success))]",      border: "border-[hsl(var(--success)/0.2)]",      glow: "" },
  busy:      { bg: "bg-[hsl(var(--warning)/0.1)]",      text: "text-[hsl(var(--warning))]",      border: "border-[hsl(var(--warning)/0.2)]",      glow: "shadow-[0_0_12px_hsl(var(--warning)/0.2)]",      pulse: true },
  uploading: { bg: "bg-[hsl(var(--secondary)/0.1)]",    text: "text-[hsl(var(--secondary))]",    border: "border-[hsl(var(--secondary)/0.2)]",    glow: "shadow-[0_0_12px_hsl(var(--secondary)/0.2)]",    pulse: true },
  assigned:  { bg: "bg-[hsl(var(--primary)/0.1)]",      text: "text-[hsl(var(--primary))]",      border: "border-[hsl(var(--primary)/0.2)]",      glow: "" },
  accepted:  { bg: "bg-[hsl(var(--primary)/0.1)]",      text: "text-[hsl(var(--primary))]",      border: "border-[hsl(var(--primary)/0.2)]",      glow: "" },
  completed: { bg: "bg-[hsl(var(--primary)/0.1)]",      text: "text-[hsl(var(--primary))]",      border: "border-[hsl(var(--primary)/0.2)]",      glow: "shadow-[0_0_12px_hsl(var(--primary)/0.2)]" },
  confirmed: { bg: "bg-[hsl(var(--success)/0.1)]",      text: "text-[hsl(var(--success))]",      border: "border-[hsl(var(--success)/0.2)]",      glow: "shadow-[0_0_12px_hsl(var(--success)/0.2)]" },
  noshow:    { bg: "bg-[hsl(var(--muted-foreground)/0.1)]", text: "text-[hsl(var(--muted-foreground))]", border: "border-[hsl(var(--outline-variant)/0.2)]", glow: "" },
  success:   { bg: "bg-[hsl(var(--success)/0.1)]",      text: "text-[hsl(var(--success))]",      border: "border-[hsl(var(--success)/0.2)]",      glow: "shadow-[0_0_12px_hsl(var(--success)/0.2)]" },
  failed:    { bg: "bg-[hsl(var(--destructive)/0.1)]",  text: "text-[hsl(var(--destructive))]",  border: "border-[hsl(var(--destructive)/0.2)]",  glow: "shadow-[0_0_12px_hsl(var(--destructive)/0.2)]" },
  error:     { bg: "bg-[hsl(var(--destructive)/0.1)]",  text: "text-[hsl(var(--destructive))]",  border: "border-[hsl(var(--destructive)/0.2)]",  glow: "shadow-[0_0_12px_hsl(var(--destructive)/0.2)]" },
  timed_out: { bg: "bg-[hsl(var(--destructive)/0.1)]",  text: "text-[hsl(var(--destructive))]",  border: "border-[hsl(var(--destructive)/0.2)]",  glow: "shadow-[0_0_12px_hsl(var(--destructive)/0.2)]" },
  cancelled: { bg: "bg-[hsl(var(--muted-foreground)/0.1)]", text: "text-[hsl(var(--muted-foreground))]", border: "border-[hsl(var(--outline-variant)/0.2)]", glow: "" },
  skipped:   { bg: "bg-[hsl(var(--muted-foreground)/0.1)]", text: "text-[hsl(var(--muted-foreground))]", border: "border-[hsl(var(--outline-variant)/0.2)]", glow: "" },
  inactive:  { bg: "bg-[hsl(var(--muted-foreground)/0.1)]", text: "text-[hsl(var(--muted-foreground))]", border: "border-[hsl(var(--outline-variant)/0.2)]", glow: "" },
  disabled:  { bg: "bg-[hsl(var(--muted-foreground)/0.1)]", text: "text-[hsl(var(--muted-foreground))]", border: "border-[hsl(var(--outline-variant)/0.2)]", glow: "" },
  offline:   { bg: "bg-[hsl(var(--muted-foreground)/0.1)]", text: "text-[hsl(var(--muted-foreground))]", border: "border-[hsl(var(--outline-variant)/0.2)]", glow: "" },
  paused:    { bg: "bg-[hsl(var(--warning)/0.1)]",      text: "text-[hsl(var(--warning))]",      border: "border-[hsl(var(--warning)/0.2)]",      glow: "" },
  // plan tiers
  starter:   { bg: "bg-[hsl(var(--muted-foreground)/0.1)]", text: "text-[hsl(var(--muted-foreground))]", border: "border-[hsl(var(--muted-foreground)/0.2)]", glow: "" },
  growth:    { bg: "bg-[hsl(var(--secondary)/0.1)]",        text: "text-[hsl(var(--secondary))]",        border: "border-[hsl(var(--secondary)/0.2)]",        glow: "" },
  pro:       { bg: "bg-[hsl(var(--primary)/0.1)]",          text: "text-[hsl(var(--primary))]",          border: "border-[hsl(var(--primary)/0.2)]",          glow: "shadow-[0_0_12px_hsl(var(--primary)/0.2)]" },
};

const DEFAULT_CONFIG: StatusConfig = {
  bg: "bg-[hsl(var(--muted-foreground)/0.1)]",
  text: "text-[hsl(var(--muted-foreground))]",
  border: "border-[hsl(var(--outline-variant)/0.2)]",
  glow: "",
};

export interface EnumBadgeProps {
  status: string;
  className?: string;
}

/** Generic colored badge for any enum/status value. */
export function EnumBadge({ status, className }: EnumBadgeProps) {
  const config = STATUS_CONFIG[status.toLowerCase()] ?? DEFAULT_CONFIG;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border",
        "text-[11px] font-bold uppercase tracking-wider",
        config.bg, config.text, config.border, config.glow,
        className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.text.replace("text-", "bg-"), config.pulse && "animate-pulse")} />
      {status}
    </span>
  );
}
