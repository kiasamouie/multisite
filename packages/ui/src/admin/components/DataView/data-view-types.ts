import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  width?: string;
  className?: string;
  /** Hide this column on mobile (below sm breakpoint) */
  hideOnMobile?: boolean;
  /** Allow clicking the column header to sort by this column */
  sortable?: boolean;
  render?: (item: T) => ReactNode;
}
