import { cn } from "../../../lib/cn";

export type JsonBlockVariant = "default" | "error" | "success" | "info";

interface VariantConfig {
  labelClass: string;
  bg: string;
  textClass: string;
}

const VARIANT_CONFIG: Record<JsonBlockVariant, VariantConfig> = {
  default: {
    labelClass: "text-muted-foreground",
    bg: "bg-[hsl(var(--surface-lowest))]",
    textClass: "text-muted-foreground",
  },
  error: {
    labelClass: "text-destructive",
    bg: "bg-destructive/5",
    textClass: "text-destructive",
  },
  success: {
    labelClass: "text-[hsl(var(--success))]",
    bg: "bg-[hsl(var(--surface-lowest))]",
    textClass: "text-muted-foreground",
  },
  info: {
    labelClass: "text-[hsl(var(--secondary))]",
    bg: "bg-[hsl(var(--surface-lowest))]",
    textClass: "text-muted-foreground",
  },
};

export interface JsonBlockProps {
  label: string;
  data: unknown;
  variant?: JsonBlockVariant;
}

export function JsonBlock({ label, data, variant = "default" }: JsonBlockProps) {
  if (!data || (typeof data === "object" && Object.keys(data as object).length === 0)) return null;
  const { labelClass, bg, textClass } = VARIANT_CONFIG[variant];
  return (
    <div className="rounded-xl overflow-hidden border border-[hsl(var(--outline-variant)/0.1)]">
      <div className="px-4 py-2.5 border-b border-[hsl(var(--outline-variant)/0.1)] flex items-center justify-between">
        <span className={cn("text-[10px] font-bold uppercase tracking-widest", labelClass)}>
          {label}
        </span>
      </div>
      <pre
        className={cn(
          "p-4 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono",
          bg,
          textClass,
        )}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
