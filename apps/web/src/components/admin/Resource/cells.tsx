import type { ReactNode } from "react";
import { Badge } from "@repo/ui/badge";

/**
 * Built-in cell renderers for common data shapes.
 * Use these as the `render` prop on a ColumnDef:
 *
 *   { key: "admin_enabled", label: "Status", render: StatusCell }
 *   { key: "created_at",    label: "Created", render: DateCell }
 */

/** Green "Active" / grey "Inactive" badge */
export function StatusCell(value: unknown): ReactNode {
  const active = Boolean(value);
  return (
    <Badge variant={active ? "default" : "secondary"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

/** Green "Enabled" / grey "Disabled" badge */
export function EnabledCell(value: unknown): ReactNode {
  const enabled = Boolean(value);
  return (
    <Badge variant={enabled ? "default" : "secondary"}>
      {enabled ? "Enabled" : "Disabled"}
    </Badge>
  );
}

/** Blue pill showing a plan name */
export function PlanBadgeCell(value: unknown): ReactNode {
  return (
    <Badge variant="outline">
      {String(value ?? "")}
    </Badge>
  );
}

/** Small muted text — good for IDs, secondary info */
export function MutedCell(value: unknown): ReactNode {
  return (
    <span className="text-xs text-muted-foreground">{String(value ?? "")}</span>
  );
}

/** Helper: builds a properly formatted URL */
export function buildUrl(domain: string, path: string = ""): string {
  const isLocalhost = domain.includes("localhost") || domain.startsWith("127.");
  if (isLocalhost) {
    const baseUrl = domain.includes(":") ? domain : `${domain}:3000`;
    return `http://${baseUrl}${path}`;
  }
  return `https://${domain}${path}`;
}

/** Renders value as a clickable link */
export function LinkCell(value: unknown): ReactNode {
  const text = String(value ?? "");
  if (!text) return <span className="text-xs text-muted-foreground">—</span>;
  const isUrl = text.startsWith("http://") || text.startsWith("https://");
  const url = isUrl ? text : buildUrl(text);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-primary hover:underline"
      title={`Open ${text}`}
    >
      {text}
    </a>
  );
}

/** Formats a date string as a localised short date */
export function DateCell(value: unknown): ReactNode {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  try {
    return (
      <span className="text-xs text-muted-foreground">
        {new Date(String(value)).toLocaleDateString()}
      </span>
    );
  } catch {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
}

/**
 * Factory: create a badge cell with a given variant.
 */
export function makeBadgeCell(variant: "default" | "secondary" | "destructive" | "outline" = "outline") {
  return function BadgeCell(value: unknown): ReactNode {
    return (
      <Badge variant={variant}>
        {String(value ?? "")}
      </Badge>
    );
  };
}

/** Renders a boolean as a simple Yes / No text */
export function BooleanCell(value: unknown): ReactNode {
  return (
    <Badge variant={value ? "default" : "secondary"}>
      {value ? "Yes" : "No"}
    </Badge>
  );
}
