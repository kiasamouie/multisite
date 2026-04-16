// Layout components
export { DashboardLayout, AppSidebar } from "./layout";
export type { DashboardLayoutProps, AppSidebarProps } from "./layout";
export { PageHeader } from "./layout/PageHeader";
export type { NavItem } from "@repo/lib/config/dashboardConfig";

// Theme components
export { ThemeToggle } from "./theme";

// Modal components
export { CreateModal, EditModal } from "./modals";

// Admin component library
export {
  StatusBadge,
  InfoCard,
  DataView,
  CrudModal,
  ConfirmDialog,
  Filter,
  EmptyState,
  LoadingState,
  Chart,
  ActivityFeed,
  AlertBanner,
  CollapsibleSection,
  ReadOnlyField,
  JsonBlock,
  DetailLayout,
  ProgressBar,
  ComponentPageHeader,
} from "./components";
export type {
  StatusBadgeProps,
  InfoCardProps,
  DataViewProps,
  Column,
  CrudModalProps,
  CrudMode,
  CrudModalSize,
  ConfirmDialogProps,
  FilterProps,
  FilterOption,
  FilterItemConfig,
  EmptyStateProps,
  LoadingStateProps,
  ChartProps,
  ChartSeries,
  ActivityFeedProps,
  ActivityFeedItem,
  AlertBannerProps,
  ReadOnlyFieldProps,
  JsonBlockProps,
  JsonBlockVariant,
  DetailLayoutProps,
  ProgressBarProps,
  PageHeaderProps,
} from "./components";
