// Main component
export { Resource } from "./Resource";

// Types (useful for building column/field configs with type safety)
export type { ColumnDef, FieldDef, FieldOption, JoinDef, ResourceProps } from "./Resource/types";

// Built-in cell renderers
export {
  StatusCell,
  EnabledCell,
  PlanBadgeCell,
  MutedCell,
  LinkCell,
  buildUrl,
  DateCell,
  BooleanCell,
  makeBadgeCell,
} from "./Resource/cells";

// SidePanel (part of Resource)
export { SidePanel } from "./Resource/SidePanel";
export type { SidePanelWidth } from "./Resource/SidePanel";

// Tenants module — context, flags view
export { TenantAdminContext, useTenantAdmin, TenantFlagsView } from "./tenants";

// Media module — upload component
export { MediaUploadInput } from "./media";
