import type { ReactNode } from "react";
import type { CrudFilter } from "@refinedev/core";
import type { SidePanelWidth } from "./SidePanel";

export interface ColumnDef<T = Record<string, unknown>> {
  key: string;
  label: string;
  /**
   * Custom cell renderer. Receives the raw cell value and the whole row.
   * Built-in renderers (StatusCell, PlanBadgeCell, DateCell, etc.) from cells.tsx
   * can be passed directly: `render: StatusCell`
   */
  render?: (value: unknown, row: T) => ReactNode;
  /** Show sort arrows in the header (only active when canSort=true on Resource) */
  sortable?: boolean;
  /** Optional CSS width e.g. "8rem" */
  width?: string;
}

export interface FieldOption {
  value: string;
  label: string;
}

/**
 * Describes a related table to join when reading and writing via the Resource component.
 *
 * @example
 *   joins={[{ resource: "subscriptions", foreignKey: "tenant_id", idKey: "id" }]}
 */
export interface JoinDef {
  /** Supabase table name of the joined resource (e.g. "subscriptions") */
  resource: string;
  /** Column in the joined table that references the main table's PK (e.g. "tenant_id") */
  foreignKey: string;
  /** PK column of the joined table — used to decide update vs insert. Default: "id" */
  idKey?: string;
  /**
   * Whether the join returns a single row or multiple rows per main record.
   * Affects how the edit form pre-fills: "one" uses the first (or only) element.
   * Default: "one"
   */
  cardinality?: "one" | "many";
}

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "email" | "number" | "select" | "checkbox" | "textarea";
  options?: FieldOption[]; // required when type === "select"
  required?: boolean;
  /** Field is rendered as disabled when the form is open in edit mode */
  disabledOnEdit?: boolean;
  placeholder?: string;
  /**
   * When set, this field belongs to a joined table rather than the main resource.
   * Must match the `resource` of a `JoinDef` passed to `<Resource joins={[...]} />`.
   * Read values are extracted from the nested row data; writes go to the joined table.
   */
  joinResource?: string;
}

export interface ResourceProps<T = Record<string, unknown>> {
  // ── Data ────────────────────────────────────────────────────────────────
  /** Supabase table / Refine resource name */
  resource: string;
  /** Column definitions for the table */
  columns: ColumnDef<T>[];
  /** Declarative fields for the create form modal */
  createFields?: FieldDef[];
  /** Declarative fields for the edit form modal. Falls back to createFields if omitted. */
  editFields?: FieldDef[];
  /** Initial/reset form state values (keyed by field.key) */
  defaultValues?: Record<string, unknown>;
  /**
   * PostgREST select string passed to the Supabase data provider.
   * Use this to join related tables in the list query.
   *
   * @example
   *   select="*, subscriptions!inner(id, status)"
   *   select="*, feature_flags(key, enabled)"
   */
  select?: string;
  /**
   * Initial Refine filters to apply to the table query.
   * Useful for restricting visible rows by tenant, status, etc.
   *
   * @example
   *   filters={[{ field: "tenant_id", operator: "eq", value: 123 }]}
   */
  filters?: CrudFilter[];
  /**
   * Describe joined tables for write operations (create / edit).
   * Each entry maps to a Supabase table that has a FK pointing to the main resource.
   * Fields with `joinResource` set will be read from / written to the matching JoinDef table.
   *
   * @example
   *   joins={[{ resource: "subscriptions", foreignKey: "tenant_id" }]}
   */
  joins?: JoinDef[];

  // ── Display ─────────────────────────────────────────────────────────────
  title?: string;
  /** Defaults to "{total} records" when omitted */
  subtitle?: string;
  searchField?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  /** Override the label of the create button. Default: "+ Add" */
  createLabel?: string;
  /**
   * Extra per-row action buttons rendered after Edit/Delete.
   * Receive the full row object.
   * Example: `rowActions={(row) => <button onClick={() => …}>View</button>}`
   */
  rowActions?: (row: T) => ReactNode;

  // ── Feature flags ────────────────────────────────────────────────────────
  /** Show "+ Add" button and create modal. Default: true */
  canCreate?: boolean;
  /** Show "Edit" action and edit modal. Default: true */
  canEdit?: boolean;
  /** Show "Delete" action and confirm dialog. Default: true */
  canDelete?: boolean;
  /** Show search input. Requires searchField to be set. Default: true */
  canSearch?: boolean;
  /** Enable clickable sort arrows on columns marked sortable. Default: false */
  canSort?: boolean;
  /** Show refresh button in the table header. Default: false */
  canRefresh?: boolean;
  /** Refine syncs pagination/filters/sort to the URL. Default: true */
  syncWithLocation?: boolean;
  /**
   * Reserved for future CSV export feature.
   * Shows an Export button (not yet implemented — placeholder only). Default: false
   */
  canExport?: boolean;

  // ── Side panel ────────────────────────────────────────────────────────────
  /**
   * Attach a reusable slide-over panel to each row.
   * The `view` render prop receives the full row and returns the panel content.
   * The Resource component manages open/close state internally.
   *
   * @example
   *   sidePanel={{
   *     icon: "toggle_on",
   *     title: "Feature Flags",
   *     subtitle: "Per-tenant feature overrides",
   *     view: (row) => <TenantFlagsView tenant={row as TenantRow} />,
   *   }}
   */
  sidePanel?: {
    /** material-symbols icon name. Default: "open_in_new" */
    icon?: string;
    /** Tooltip on the row button + SidePanel header */
    title: string;
    /** SidePanel sub-header. Receives the active row for dynamic text. */
    subtitle?: string | ((row: T) => string);
    /** Render the panel content for a given row */
    view: (row: T) => ReactNode;
    width?: SidePanelWidth;
  };

  /**
   * Transform form values before they are passed to createRecord.
   * Use this to normalize or enrich fields (e.g. domain normalization) without
   * putting business logic inside the generic Resource component.
   *
   * @example
   *   transformValues={(values) => ({ ...values, domain: normalizeDomain(String(values.domain ?? "")) })}
   */
  transformValues?: (values: Record<string, unknown>) => Record<string, unknown>;

  /**
   * Override the default Refine delete with a custom async handler.
   * Return true to signal success (Resource handles UI state), throw/return false on failure.
   * Use this when delete requires server-side side effects (e.g. removing files from storage).
   *
   * @example
   *   onDeleteRow={async (row) => {
   *     const res = await fetch(`/api/media/${row.id}`, { method: "DELETE" });
   *     if (!res.ok) throw new Error("Delete failed");
   *   }}
   */
  onDeleteRow?: (row: T) => Promise<void>;
}
