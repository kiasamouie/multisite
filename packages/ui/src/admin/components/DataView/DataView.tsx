"use client";

import { useEffect, useState } from "react";
import type { ReactNode, ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  RefreshCw, FolderOpen, Plus, ChevronLeft, ChevronRight,
  Pencil, Trash2, ExternalLink,
  ArrowUpDown, ArrowUp, ArrowDown,
  ListOrdered, GripVertical, Check, X as XIcon,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { toast } from "sonner";
import type { Column } from "./data-view-types";
import { LoadingState } from "../EmptyState";
import { EmptyState } from "../EmptyState";
import { Filter } from "../Filter";
import type { FilterProps } from "../Filter";
import { PageHeader } from "../PageHeader";
import { CrudModal } from "../CrudModal";
import { ConfirmDialog } from "../ConfirmDialog";
import { useBreakpoint } from "../../../hooks/use-breakpoint";

type FilterBarProps = Omit<Extract<FilterProps, { type: "bar" }>, "type">;
type ModalSize = "md" | "lg" | "xl" | "full";

// ─── Generic-action config types ────────────────────────────────────────────

interface ViewModalConfig<T> {
  title?: (item: T) => string;
  description?: (item: T) => string;
  content: (item: T) => ReactNode;
  size?: ModalSize;
  /** Called when the view modal opens (use to fetch detail data) */
  onOpen?: (item: T) => void;
}

interface EditModalConfig<T> {
  title?: (item: T) => string;
  /** Form fields JSX — can close over caller state */
  content: (item: T) => ReactNode;
  /** Called with the item when the user submits — DataView calls e.preventDefault() */
  onSubmit: (item: T) => void | Promise<void>;
  /** Called when the edit button is clicked (use to initialise form state) */
  onOpen?: (item: T) => void;
  submitting?: boolean;
  submitLabel?: string;
  size?: ModalSize;
}

interface DeleteConfig<T> {
  onConfirm: (item: T) => void | Promise<void>;
  title?: string | ((item: T) => string);
  description?: string | ((item: T) => string);
}

interface DataViewBase<T> {
  data: T[];
  keyExtractor?: (item: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  /** Called when a row/card is clicked (overridden by canView when viewModal is set) */
  onRowClick?: (item: T) => void;
  /** Per-row custom action slot — rendered after the built-in actions */
  rowActions?: (item: T) => ReactNode;
  className?: string;
  title?: string;
  titleActions?: ReactNode;
  titleBackHref?: string;
  filter?: FilterBarProps;
  selectedKey?: string;
  scrollable?: boolean;
  onRefresh?: () => void;
  // Pagination
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  /** Current page size. Used to display and drive the rows-per-page dropdown. */
  pageSize?: number;
  /** Called when the user picks a different page size. Reset to page 1 is the caller's responsibility. */
  onPageSizeChange?: (size: number) => void;
  /** Available page-size options shown in the dropdown. Defaults to [10, 25, 50, 100]. */
  pageSizeOptions?: number[];
  // ── Generic built-in actions ──────────────────────────────────────────────
  /** Clicking a row opens the view modal */
  canView?: boolean;
  viewModal?: ViewModalConfig<T>;
  /** Renders an Edit icon button; clicking opens the edit modal */
  canEdit?: boolean;
  editModal?: EditModalConfig<T>;
  /** Renders a Delete icon button; clicking opens a confirmation dialog */
  canDelete?: boolean;
  deleteConfig?: DeleteConfig<T>;
  /** Renders an ExternalLink icon button that navigates to a detail page */
  viewHref?: (item: T) => string;
  // ── Drag-to-reorder (opt-in, generic) ─────────────────────────────────────
  /** Enables a Sort button (next to Refresh) that toggles drag-to-reorder mode. */
  reorderable?: boolean;
  /** Called with the new ordered list when the user clicks Save. */
  onSaveOrder?: (items: T[]) => void | Promise<void>;
  /** External saving state — disables Save button and shows spinner. */
  savingOrder?: boolean;
}

export interface DataViewTableProps<T> extends DataViewBase<T> {
  view?: "table";
  mode?: "table";
  columns: Column<T>[];
  renderCard?: undefined;
  cardCols?: undefined;
}

export interface DataViewCardProps<T> extends DataViewBase<T> {
  view?: "card";
  mode?: "card";
  renderCard: (item: T) => ReactNode;
  columns?: undefined;
  cardCols?: string;
}

export interface DataViewGroupedProps<G, I> {
  view?: "grouped";
  mode?: "grouped";
  groups: G[];
  groupKey: (group: G) => string;
  groupItems: (group: G) => I[];
  itemKey: (item: I) => string;
  ungroupedItems?: I[];
  ungroupedLabel?: string;
  renderGroupHeader: (group: G) => ReactNode;
  renderItem: (item: I, group: G | null) => ReactNode;
  groupActions?: (group: G) => ReactNode;
  itemActions?: (item: I, group: G | null) => ReactNode;
  onCreateGroup?: () => void;
  createGroupLabel?: string;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ComponentType<{ className?: string }>;
  className?: string;
  title?: string;
  titleActions?: ReactNode;
  titleBackHref?: string;
  filter?: FilterBarProps;
  onRefresh?: () => void;
}

export type DataViewProps<T, I = unknown> = DataViewTableProps<T> | DataViewCardProps<T> | DataViewGroupedProps<T, I>;

export function DataView<T, I = unknown>(props: DataViewProps<T, I>) {
  // Hooks must come before any conditional returns
  const isDesktop = useBreakpoint("sm");
  const [viewItem, setViewItem] = useState<T | null>(null);
  const [editItem, setEditItem] = useState<T | null>(null);
  const [deleteItem, setDeleteItem] = useState<T | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  // Drag-to-reorder state
  const [isReordering, setIsReordering] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<T[] | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  // Wrap onRefresh callbacks with a small confirmation toast so every
  // DataView refresh button has identical UX without each caller wiring it up.
  const wrapRefresh = (cb?: () => void) =>
    cb
      ? () => {
          cb();
          toast.info("Refreshed", { duration: 1500 });
        }
      : undefined;

  // Resolve view from either `view` or `mode` prop
  const resolvedView =
    (props as { view?: string; mode?: string }).view ??
    (props as { mode?: string }).mode ??
    "table";

  // ── Grouped mode — early return ───────────────────────────────────────────
  if (resolvedView === "grouped") {
    const {
      groups, groupKey, groupItems, itemKey,
      ungroupedItems = [], ungroupedLabel = "Ungrouped",
      renderGroupHeader, renderItem, groupActions, itemActions,
      onCreateGroup, createGroupLabel = "New Group",
      emptyMessage: gEmptyMsg = "No items yet",
      emptyIcon: GEmptyIcon = FolderOpen,
      loading: gLoading = false, className: gClassName,
      title: gTitle, titleActions: gTitleActions, titleBackHref: gTitleBackHref,
      filter: gFilter, onRefresh: gOnRefresh,
    } = props as DataViewGroupedProps<T, I>;

    const gHeader = gTitle
      ? <PageHeader title={gTitle} actions={gTitleActions} backHref={gTitleBackHref} />
      : null;

    const gTopBar = (gFilter || gOnRefresh || onCreateGroup) ? (
      <div className="flex items-center gap-2">
        {gFilter && <div className="flex-1"><Filter type="bar" {...gFilter} /></div>}
        {gOnRefresh && (
          <Button variant="ghost" size="icon" onClick={wrapRefresh(gOnRefresh)} disabled={gLoading} title="Refresh">
            <RefreshCw className={`h-4 w-4 transition-transform ${gLoading ? "animate-spin" : ""}`} />
          </Button>
        )}
        {onCreateGroup && (
          <Button size="sm" variant="outline" onClick={onCreateGroup}>
            <Plus className="mr-1 h-3.5 w-3.5" />{createGroupLabel}
          </Button>
        )}
      </div>
    ) : null;

    const hasGroups = groups.length > 0;
    const hasUngrouped = ungroupedItems.length > 0;
    const isEmpty = !hasGroups && !hasUngrouped;

    if (gLoading) {
      return (
        <div className={`space-y-3 ${gClassName ?? ""}`}>
          {gHeader}{gTopBar}<LoadingState />
        </div>
      );
    }

    return (
      <div className={`space-y-3 ${gClassName ?? ""}`}>
        {gHeader}
        {gTopBar}
        {isEmpty && <EmptyState message={gEmptyMsg} icon={GEmptyIcon} />}
        {groups.map(group => {
          const items = groupItems(group);
          return (
            <Card key={groupKey(group)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">{renderGroupHeader(group)}</div>
                  {groupActions && (
                    <div className="flex items-center gap-1 shrink-0 ml-2">{groupActions(group)}</div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 italic">No items in this group</p>
                ) : (
                  <div className="divide-y divide-border">
                    {items.map(item => (
                      <div key={itemKey(item)} className="flex items-center justify-between py-2 gap-2">
                        <div className="flex-1 min-w-0">{renderItem(item, group)}</div>
                        {itemActions && (
                          <div className="flex items-center gap-1 shrink-0">{itemActions(item, group)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {hasUngrouped && (
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{ungroupedLabel}</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y divide-border">
                {ungroupedItems.map(item => (
                  <div key={itemKey(item)} className="flex items-center justify-between py-2 gap-2">
                    <div className="flex-1 min-w-0">{renderItem(item, null)}</div>
                    {itemActions && (
                      <div className="flex items-center gap-1 shrink-0">{itemActions(item, null)}</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── Table / Card mode ─────────────────────────────────────────────────────
  const {
    data,
    keyExtractor: keyExtractorProp,
    loading = false,
    emptyMessage = "No results found",
    emptyIcon,
    onRowClick,
    rowActions,
    className,
    title,
    titleActions,
    titleBackHref,
    filter,
    selectedKey,
    scrollable,
    onRefresh,
    page,
    totalPages,
    onPageChange,
    pageSize,
    onPageSizeChange,
    pageSizeOptions,
    canView,
    viewModal,
    canEdit,
    editModal,
    canDelete,
    deleteConfig,
    viewHref,
    reorderable,
    onSaveOrder,
    savingOrder = false,
    ...rest
  } = props as DataViewTableProps<T> | DataViewCardProps<T>;

  // Default keyExtractor: use `id` if it exists, otherwise index
  const keyExtractor =
    keyExtractorProp ??
    ((item: T) => {
      const rec = item as Record<string, unknown>;
      return rec.id != null ? String(rec.id) : String(data.indexOf(item));
    });

  // Keep pendingOrder fresh when data changes outside reorder mode
  useEffect(() => {
    if (!isReordering) {
      setPendingOrder(null);
    }
  }, [data, isReordering]);

  const header = title
    ? <PageHeader title={title} actions={titleActions} backHref={titleBackHref} />
    : null;

  const refreshButton = onRefresh ? (
    <Button variant="ghost" size="icon" onClick={wrapRefresh(onRefresh)} disabled={loading} title="Refresh" className="h-8 w-8 shrink-0">
      <RefreshCw className={`h-4 w-4 transition-transform ${loading ? "animate-spin" : ""}`} />
    </Button>
  ) : null;

  // Reorder controls (Sort / Save / Discard) — rendered to the LEFT of Refresh
  const enterReorder = () => {
    setPendingOrder([...data]);
    setIsReordering(true);
  };
  const discardReorder = () => {
    setIsReordering(false);
    setPendingOrder(null);
    setDraggingKey(null);
    setDragOverKey(null);
  };
  const saveReorder = async () => {
    if (!onSaveOrder || !pendingOrder) return;
    try {
      await onSaveOrder(pendingOrder);
      setIsReordering(false);
      setPendingOrder(null);
      setDraggingKey(null);
      setDragOverKey(null);
    } catch {
      // Caller is expected to surface errors; stay in reorder mode so user can retry
    }
  };

  const reorderControls = reorderable ? (
    <div className="flex items-center gap-1 shrink-0 transition-all duration-200">
      {!isReordering ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={enterReorder}
          disabled={loading || data.length < 2}
          title="Reorder"
          className="h-8 w-8 transition-all duration-200 hover:bg-[hsl(var(--primary)/0.1)] hover:text-primary"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      ) : (
        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-1 duration-200">
          <Button
            variant="ghost"
            size="icon"
            onClick={discardReorder}
            disabled={savingOrder}
            title="Discard changes"
            className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
          >
            <XIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={saveReorder}
            disabled={savingOrder}
            title="Save order"
            className="h-8 transition-all duration-200"
          >
            {savingOrder ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Check className="mr-1 h-3.5 w-3.5" />
                Save order
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  ) : null;

  const topBar = (filter || onRefresh || reorderable) ? (
    <div className="flex items-center gap-2">
      {filter && <div className="flex-1"><Filter type="bar" {...filter} /></div>}
      {!filter && <div className="flex-1" />}
      {reorderControls}
      {refreshButton}
    </div>
  ) : null;

  const PAGE_SIZE_OPTIONS = pageSizeOptions ?? [10, 25, 50, 100];

  const paginationBar = (totalPages && totalPages > 1 && onPageChange) || onPageSizeChange ? (
    <div className="flex items-center justify-between px-2 py-2">
      <span className="text-xs text-muted-foreground">
        {totalPages && totalPages > 1 ? `Page ${page ?? 1} of ${totalPages}` : ""}
      </span>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <Select
            value={String(pageSize ?? PAGE_SIZE_OPTIONS[0])}
            onValueChange={(v) => { onPageSizeChange(Number(v)); }}
          >
            <SelectTrigger className="h-7 w-[80px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(n => (
                <SelectItem key={n} value={String(n)} className="text-xs">{n} / page</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {totalPages && totalPages > 1 && onPageChange && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={(page ?? 1) <= 1}
              onClick={() => onPageChange((page ?? 1) - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={(page ?? 1) >= totalPages}
              onClick={() => onPageChange((page ?? 1) + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  if (loading) return (
    <div className={`space-y-3 ${className ?? ""}`}>
      {header}{topBar}<LoadingState />
    </div>
  );
  if (data.length === 0) return (
    <div className={`space-y-3 ${className ?? ""}`}>
      {header}{topBar}<EmptyState message={emptyMessage} icon={emptyIcon} />
    </div>
  );

  // Whether a row/card is clickable
  const isRowClickable = !!(onRowClick || (canView && viewModal));

  // Whether the actions column should be rendered
  const hasBuiltinActions = !!(viewHref || (canEdit && editModal) || (canDelete && deleteConfig));
  const hasActionsColumn = hasBuiltinActions || !!rowActions;

  // Row click handler
  const handleRowClick = (item: T) => {
    if (canView && viewModal) {
      viewModal.onOpen?.(item);
      setViewItem(item);
    } else {
      onRowClick?.(item);
    }
  };

  // Built-in action buttons for a given row
  const renderBuiltinActions = (row: T) => (
    <>
      {viewHref && (
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View detail page">
          <a href={viewHref(row)} onClick={e => e.stopPropagation()}>
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      )}
      {canEdit && editModal && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Edit"
          onClick={() => { editModal.onOpen?.(row); setEditItem(row); }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {canDelete && deleteConfig && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          title="Delete"
          onClick={() => setDeleteItem(row)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </>
  );

  // Resolve delete title/description strings
  const resolveDeleteTitle = (item: T) =>
    typeof deleteConfig?.title === "function"
      ? deleteConfig.title(item)
      : deleteConfig?.title ?? "Are you sure?";

  const resolveDeleteDescription = (item: T) =>
    typeof deleteConfig?.description === "function"
      ? deleteConfig.description(item)
      : deleteConfig?.description;

  // Shared modals rendered at the bottom of every mode
  const modals = (
    <>
      {viewModal && (
        <CrudModal
          open={viewItem !== null}
          onOpenChange={(open) => { if (!open) setViewItem(null); }}
          mode="view"
          title={viewItem ? viewModal.title?.(viewItem) : undefined}
          description={viewItem ? viewModal.description?.(viewItem) : undefined}
          size={viewModal.size ?? "lg"}
        >
          {viewItem && viewModal.content(viewItem)}
        </CrudModal>
      )}

      {editModal && (
        <CrudModal
          open={editItem !== null}
          onOpenChange={(open) => { if (!open) setEditItem(null); }}
          mode="edit"
          title={editItem ? editModal.title?.(editItem) : undefined}
          size={editModal.size ?? "md"}
          onSubmit={editItem ? (e) => { e.preventDefault(); void editModal.onSubmit(editItem); } : undefined}
          submitting={editModal.submitting}
          submitLabel={editModal.submitLabel}
        >
          {editItem && editModal.content(editItem)}
        </CrudModal>
      )}

      {deleteConfig && (
        <ConfirmDialog
          open={deleteItem !== null}
          onConfirm={() => {
            if (deleteItem) void deleteConfig.onConfirm(deleteItem);
            setDeleteItem(null);
          }}
          onCancel={() => setDeleteItem(null)}
          title={deleteItem ? resolveDeleteTitle(deleteItem) : "Are you sure?"}
          description={deleteItem ? resolveDeleteDescription(deleteItem) : undefined}
          confirmLabel="Delete"
          destructive
        />
      )}
    </>
  );

  // ── Card mode ─────────────────────────────────────────────────────────────
  if (resolvedView === "card") {
    const { renderCard, cardCols = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" } = rest as DataViewCardProps<T>;
    return (
      <div className={`space-y-3 ${className ?? ""}`}>
        {header}
        {topBar}
        <div className={`grid gap-6 ${cardCols}`}>
          {data.map(item => (
            <Card
              key={keyExtractor(item)}
              className={`flex flex-col overflow-hidden transition-all duration-300 ${isRowClickable ? "cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]" : ""}`}
              onClick={isRowClickable ? () => handleRowClick(item) : undefined}
            >
              <CardContent className="flex-1 p-0">
                {renderCard(item)}
              </CardContent>
              {hasActionsColumn && (
                <div className="px-4 pb-4 flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                  {rowActions?.(item)}
                  {renderBuiltinActions(item)}
                </div>
              )}
            </Card>
          ))}
        </div>
        {paginationBar}
        {modals}
      </div>
    );
  }

  // ── Table mode ────────────────────────────────────────────────────────────
  const { columns: allColumns } = rest as DataViewTableProps<T>;
  const columns = isDesktop ? allColumns : allColumns.filter(col => !col.hideOnMobile);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = sortKey
    ? [...data].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey];
        const bVal = (b as Record<string, unknown>)[sortKey];
        const cmp =
          aVal == null ? 1 :
          bVal == null ? -1 :
          typeof aVal === "number" && typeof bVal === "number"
            ? aVal - bVal
            : String(aVal).localeCompare(String(bVal));
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data;

  // When in reorder mode, ignore column sorting and show pendingOrder
  const displayData = isReordering && pendingOrder ? pendingOrder : sortedData;

  // ── Drag-and-drop handlers (HTML5 native) ────────────────────────────────
  const handleDragStart = (key: string) => (e: React.DragEvent) => {
    setDraggingKey(key);
    e.dataTransfer.effectAllowed = "move";
    // Required for Firefox
    try { e.dataTransfer.setData("text/plain", key); } catch { /* ignore */ }
  };

  const handleDragOver = (key: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!draggingKey || draggingKey === key) return;
    if (dragOverKey !== key) setDragOverKey(key);

    setPendingOrder(prev => {
      const list = prev ?? [...data];
      const fromIdx = list.findIndex(it => keyExtractor(it) === draggingKey);
      const toIdx = list.findIndex(it => keyExtractor(it) === key);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return list;
      const next = [...list];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const handleDragEnd = () => {
    setDraggingKey(null);
    setDragOverKey(null);
  };

  const tableBody = (
    <TableBody>
      {displayData.map(row => {
        const key = keyExtractor(row);
        const isSelected = selectedKey !== undefined && key === selectedKey;
        const isDragging = isReordering && draggingKey === key;
        const isDragOver = isReordering && dragOverKey === key && draggingKey !== key;
        return (
          <TableRow
            key={key}
            draggable={isReordering}
            onDragStart={isReordering ? handleDragStart(key) : undefined}
            onDragOver={isReordering ? handleDragOver(key) : undefined}
            onDragEnd={isReordering ? handleDragEnd : undefined}
            onDrop={isReordering ? (e) => { e.preventDefault(); handleDragEnd(); } : undefined}
            className={[
              "transition-all duration-200",
              isRowClickable && !isReordering ? "cursor-pointer" : "",
              isSelected ? "bg-[hsl(var(--primary)/0.1)] hover:bg-[hsl(var(--primary)/0.12)]" : "",
              isReordering ? "select-none" : "",
              isDragging ? "opacity-40 scale-[0.99]" : "",
              isDragOver ? "bg-[hsl(var(--primary)/0.08)] outline outline-1 outline-[hsl(var(--primary)/0.5)]" : "",
            ].filter(Boolean).join(" ")}
            onClick={isRowClickable && !isReordering ? () => handleRowClick(row) : undefined}
          >
            {isReordering && (
              <TableCell className="w-[1%] whitespace-nowrap pr-0">
                <span className="inline-flex items-center justify-center text-muted-foreground cursor-grab active:cursor-grabbing hover:text-foreground transition-colors">
                  <GripVertical className="h-4 w-4" />
                </span>
              </TableCell>
            )}
            {columns.map(col => (
              <TableCell key={col.key} className={[col.className, col.width].filter(Boolean).join(" ")}>
                {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
              </TableCell>
            ))}
            {hasActionsColumn && (
              <TableCell onClick={e => e.stopPropagation()}>
                <div className="flex justify-end gap-2">
                  {!isReordering && rowActions?.(row)}
                  {!isReordering && renderBuiltinActions(row)}
                </div>
              </TableCell>
            )}
          </TableRow>
        );
      })}
    </TableBody>
  );

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      {header}
      {topBar}
      <div className="bg-[hsl(var(--surface-low))] rounded-xl overflow-hidden border border-[hsl(var(--outline-variant)/0.1)]">
        <div className="overflow-x-auto">
          {scrollable ? (
            <>
              <Table>
                <TableHeader className="sticky top-0 bg-[hsl(var(--surface-low))] z-10">
                  <TableRow>
                    {isReordering && <TableHead className="w-[1%]" />}
                    {columns.map(col => (
                      <TableHead
                        key={col.key}
                        className={[col.className, col.width, col.sortable ? "cursor-pointer select-none hover:text-foreground" : ""].filter(Boolean).join(" ")}
                        onClick={col.sortable ? () => handleSort(col.key) : undefined}
                      >
                        {col.sortable ? (
                          <div className="flex items-center gap-1">
                            {col.label}
                            {sortKey === col.key
                              ? sortDir === "asc"
                                ? <ArrowUp className="h-3 w-3 text-primary" />
                                : <ArrowDown className="h-3 w-3 text-primary" />
                              : <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}
                          </div>
                        ) : col.label}
                      </TableHead>
                    ))}
                    {hasActionsColumn && <TableHead className="w-[1%] whitespace-nowrap text-right text-xs">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
              </Table>
              <div className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
                <Table>{tableBody}</Table>
              </div>
            </>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isReordering && <TableHead className="w-[1%]" />}
                  {columns.map(col => (
                    <TableHead
                      key={col.key}
                      className={[col.className, col.width, col.sortable ? "cursor-pointer select-none hover:text-foreground" : ""].filter(Boolean).join(" ")}
                      onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    >
                      {col.sortable ? (
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key
                            ? sortDir === "asc"
                              ? <ArrowUp className="h-3 w-3 text-primary" />
                              : <ArrowDown className="h-3 w-3 text-primary" />
                            : <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}
                        </div>
                      ) : col.label}
                    </TableHead>
                  ))}
                  {hasActionsColumn && <TableHead className="w-[1%] whitespace-nowrap text-right text-xs">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              {tableBody}
            </Table>
          )}
        </div>
      </div>
      {paginationBar}
      {modals}
    </div>
  );
}
