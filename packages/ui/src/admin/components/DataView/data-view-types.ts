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
  /** Custom sort value extractor — use when the column key doesn't map to a
   *  directly comparable top-level field (e.g. nested or computed values). */
  sortValue?: (item: T) => string | number;
  render?: (item: T) => ReactNode;
}
