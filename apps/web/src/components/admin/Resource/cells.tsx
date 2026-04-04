import type { ReactNode } from "react";

/**
 * Built-in cell renderers for common data shapes.
 * Use these as the `render` prop on a ColumnDef:
 *
 *   { key: "admin_enabled", label: "Status", render: StatusCell }
 *   { key: "created_at",    label: "Created", render: DateCell }
 */

/** Green "Active" / grey "Inactive" badge based on a boolean value */
export function StatusCell(value: unknown): ReactNode {
  const active = Boolean(value);
  return (
    <span
      className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
        active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/** Green "Enabled" / grey "Disabled" badge based on a boolean value */
export function EnabledCell(value: unknown): ReactNode {
  const enabled = Boolean(value);
  return (
    <span
      className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
        enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
      }`}
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

/** Blue pill showing a plan name (starter / growth / pro / etc.) */
export function PlanBadgeCell(value: unknown): ReactNode {
  return (
    <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
      {String(value ?? "")}
    </span>
  );
}

/** Small muted text — good for IDs, secondary info */
export function MutedCell(value: unknown): ReactNode {
  return (
    <span className="text-xs text-muted-foreground">{String(value ?? "")}</span>
  );
}

/** Helper: builds a properly formatted URL from domain and optional path, handling localhost port injection */
export function buildUrl(domain: string, path: string = ""): string {
  const isLocalhost = domain.includes("localhost") || domain.startsWith("127.");
  if (isLocalhost) {
    const baseUrl = domain.includes(":") ? domain : `${domain}:3000`;
    return `http://${baseUrl}${path}`;
  }
  return `https://${domain}${path}`;
}

/** Renders value as a clickable link that opens in a new tab */
export function LinkCell(value: unknown): ReactNode {
  const text = String(value ?? "");
  if (!text) return <span className="text-xs text-muted-foreground">—</span>;

  // Auto-detect URL: if it looks like a domain, prepend protocol
  const isUrl = text.startsWith("http://") || text.startsWith("https://");
  const url = isUrl ? text : buildUrl(text);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
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
 * Factory: create a badge cell with a custom Tailwind colour class.
 *
 * @example
 *   const WarningBadge = makeBadgeCell("bg-yellow-100 text-yellow-800");
 *   { key: "severity", label: "Severity", render: WarningBadge }
 */
export function makeBadgeCell(colorClass: string) {
  return function BadgeCell(value: unknown): ReactNode {
    return (
      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${colorClass}`}>
        {String(value ?? "")}
      </span>
    );
  };
}

/** Renders a boolean as a simple Yes / No text */
export function BooleanCell(value: unknown): ReactNode {
  return (
    <span className={`text-xs font-medium ${value ? "text-green-700" : "text-muted-foreground"}`}>
      {value ? "Yes" : "No"}
    </span>
  );
}
