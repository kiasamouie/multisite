"use client";

import { useTable, useCreate, useUpdate, useDelete } from "@refinedev/core";
import { useState } from "react";
import { CreateModal, EditModal } from "@repo/ui/admin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/table";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import {
  Pencil,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  Settings2,
  X,
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
} from "lucide-react";

import type { ResourceProps } from "./types";
import { SkeletonRows } from "./SkeletonRows";
import { ConfirmDialog } from "./ConfirmDialog";
import { FieldRenderer } from "./FieldRenderer";
import { SidePanel } from "./SidePanel";

/**
 * Resource — universal CRUD table component.
 *
 * Encapsulates all Refine data hooks (useTable, useCreate, useUpdate,
 * useDelete) so individual pages contain zero hook boilerplate. Configure
 * everything via props: columns, fields, and feature flags.
 */
export function Resource<T extends Record<string, unknown>>({
  resource,
  columns,
  createFields = [],
  editFields,
  defaultValues = {},
  title,
  subtitle,
  searchField,
  searchPlaceholder,
  pageSize = 10,
  createLabel = "+ Add",
  rowActions,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canSearch = true,
  canSort = false,
  canRefresh = false,
  syncWithLocation = true,
  canExport = false,
  sidePanel,
  select,
  filters,
  joins,
  transformValues,
  onDeleteRow,
}: ResourceProps<T>) {
  // ── Local UI state ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRow, setEditingRow] = useState<T | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>(defaultValues);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [sidePanelRow, setSidePanelRow] = useState<T | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [runtimePageSize, setRuntimePageSize] = useState(pageSize);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [joinRowIds, setJoinRowIds] = useState<Record<string, unknown>>({});

  // ── Refine hooks ──────────────────────────────────────────────────────────
  const {
    tableQuery,
    setFilters,
    currentPage,
    setCurrentPage,
    pageSize: _activePageSize,
    setPageSize: setActivePageSize,
    pageCount,
    sorters,
    setSorters,
  } = useTable<T>({
    resource,
    pagination: { pageSize: runtimePageSize },
    syncWithLocation,
    meta: select ? { select } : undefined,
    filters: filters ? { initial: filters } : undefined,
  });

  const { mutate: createRecord } = useCreate();
  const { mutate: updateRecord } = useUpdate();
  const { mutate: deleteRecord } = useDelete();

  // ── Join helpers ──────────────────────────────────────────────────────────
  const splitFormData = (fields: typeof createFields) => {
    const main: Record<string, unknown> = {};
    const joinGroups: Record<string, Record<string, unknown>> = {};
    for (const field of fields) {
      if (field.joinResource) {
        if (!joinGroups[field.joinResource]) joinGroups[field.joinResource] = {};
        joinGroups[field.joinResource][field.key] = formData[field.key];
      } else {
        main[field.key] = formData[field.key];
      }
    }
    return { main, joinGroups };
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const rows = (tableQuery.data?.data ?? []) as T[];
  const total = tableQuery.data?.total ?? 0;
  const totalPages = pageCount || Math.ceil(total / runtimePageSize) || 1;
  const activeEditFields = editFields ?? createFields;
  const showActionsCol =
    (canEdit && activeEditFields.length > 0) || canDelete || !!rowActions || !!sidePanel;
  const visibleColumns = columns.filter((col) => columnVisibility[col.key] !== false);
  const colCount = visibleColumns.length + (showActionsCol ? 1 : 0);
  const computedSubtitle = subtitle ?? `${total} record${total === 1 ? "" : "s"}`;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    if (searchField) {
      if (query.trim()) {
        setFilters([{ field: searchField, operator: "contains", value: query }]);
      } else {
        setFilters([], "replace");
      }
    }
  };

  const handleSort = (key: string) => {
    const existing = sorters.find((s) => s.field === key);
    if (!existing) {
      setSorters([{ field: key, order: "asc" }]);
    } else if (existing.order === "asc") {
      setSorters([{ field: key, order: "desc" }]);
    } else {
      setSorters([]);
    }
  };

  const handlePageSizeChange = (value: string) => {
    const newSize = Number(value);
    setRuntimePageSize(newSize);
    setActivePageSize(newSize);
    setCurrentPage(1);
  };

  const sortIcon = (key: string) => {
    const s = sorters.find((s) => s.field === key);
    if (!s) return <ChevronsUpDown className="h-4 w-4" />;
    return s.order === "asc"
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  const handleCreateOpen = () => {
    setFormData({ ...defaultValues });
    setShowCreateModal(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    const { main, joinGroups } = splitFormData(createFields);
    const hasJoins = Object.keys(joinGroups).length > 0;
    const rawValues = hasJoins ? main : formData;
    const values = transformValues ? transformValues(rawValues) : rawValues;
    createRecord(
      { resource, values },
      {
        onSuccess: (result) => {
          setIsCreating(false);
          setShowCreateModal(false);
          setFormData({ ...defaultValues });
          if (hasJoins) {
            const newId = (result?.data as Record<string, unknown>)?.id as string | number | undefined;
            if (newId !== undefined) {
              for (const [joinResource, joinValues] of Object.entries(joinGroups)) {
                const jd = joins?.find((j) => j.resource === joinResource);
                if (!jd) continue;
                createRecord({ resource: joinResource, values: { [jd.foreignKey]: newId, ...joinValues } });
              }
            }
          }
          tableQuery.refetch();
        },
        onError: () => setIsCreating(false),
      },
    );
  };

  const handleEditClick = (row: T) => {
    const fields = activeEditFields;
    const initial: Record<string, unknown> = { ...defaultValues };
    const newJoinRowIds: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.joinResource) {
        const jd = joins?.find((j) => j.resource === field.joinResource);
        if (jd) {
          const raw = row[jd.resource];
          const joinData = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | undefined;
          initial[field.key] = joinData?.[field.key];
          newJoinRowIds[jd.resource] = joinData?.[jd.idKey ?? "id"];
        }
      } else {
        const v = row[field.key];
        initial[field.key] = v !== undefined ? v : (defaultValues[field.key] ?? "");
      }
    }
    setJoinRowIds(newJoinRowIds);
    setFormData(initial);
    setEditingRow(row);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    setIsUpdating(true);
    const { main, joinGroups } = splitFormData(activeEditFields);
    const hasJoins = Object.keys(joinGroups).length > 0;
    const mainId = editingRow.id as string | number;
    updateRecord(
      {
        resource,
        id: mainId,
        values: hasJoins ? main : formData,
      },
      {
        onSuccess: () => {
          setIsUpdating(false);
          setEditingRow(null);
          setFormData({ ...defaultValues });
          if (hasJoins) {
            for (const [joinResource, joinValues] of Object.entries(joinGroups)) {
              const jd = joins?.find((j) => j.resource === joinResource);
              if (!jd) continue;
              const existingJoinId = joinRowIds[joinResource];
              if (existingJoinId !== undefined && existingJoinId !== null) {
                updateRecord({ resource: joinResource, id: existingJoinId as string | number, values: joinValues });
              } else {
                createRecord({ resource: joinResource, values: { [jd.foreignKey]: mainId, ...joinValues } });
              }
            }
          }
          tableQuery.refetch();
        },
        onError: () => setIsUpdating(false),
      },
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    if (onDeleteRow) {
      onDeleteRow(deleteTarget)
        .then(() => {
          setIsDeleting(false);
          setDeleteTarget(null);
          tableQuery.refetch();
        })
        .catch(() => setIsDeleting(false));
      return;
    }
    deleteRecord(
      { resource, id: deleteTarget.id as string | number },
      {
        onSuccess: () => {
          setIsDeleting(false);
          setDeleteTarget(null);
          tableQuery.refetch();
        },
        onError: () => setIsDeleting(false),
      },
    );
  };

  const setField = (key: string) => (val: unknown) =>
    setFormData((prev) => ({ ...prev, [key]: val }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      {title && (
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {computedSubtitle && (
            <p className="text-muted-foreground">{computedSubtitle}</p>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          {canSearch && searchField && (
            <Input
              placeholder={searchPlaceholder ?? `Filter ${title ?? resource}…`}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-8 w-[150px] lg:w-[250px]"
            />
          )}
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 lg:px-3"
              onClick={() => handleSearch("")}
            >
              Reset
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canRefresh && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => tableQuery.refetch()}
              disabled={tableQuery.isFetching}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${tableQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>
          )}
          {canExport && (
            <Button variant="outline" size="sm" className="h-8" disabled>
              Export
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto hidden h-8 lg:flex"
              >
                <Settings2 className="mr-2 h-4 w-4" />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  className="capitalize"
                  checked={columnVisibility[col.key] !== false}
                  onCheckedChange={(checked) =>
                    setColumnVisibility((prev) => ({ ...prev, [col.key]: !!checked }))
                  }
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {canCreate && createFields.length > 0 && (
            <Button size="sm" className="h-8" onClick={handleCreateOpen}>
              {createLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {tableQuery.isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Error loading {title ?? resource}:{" "}
          {tableQuery.error?.message ?? "Unknown error"}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((col) => (
                <TableHead
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {canSort && col.sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8 data-[state=open]:bg-accent"
                      onClick={() => handleSort(col.key)}
                    >
                      <span>{col.label}</span>
                      {sortIcon(col.key)}
                    </Button>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
              {showActionsCol && <TableHead className="w-[120px] text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableQuery.isLoading ? (
              <SkeletonRows cols={colCount} rows={Math.min(runtimePageSize, 5)} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={String(row.id)}>
                  {visibleColumns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? "")}
                    </TableCell>
                  ))}
                  {showActionsCol && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {sidePanel && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSidePanelRow(row)}
                            title={sidePanel.title}
                          >
                            {sidePanel.icon
                              ? <sidePanel.icon className="h-4 w-4" />
                              : <SlidersHorizontal className="h-4 w-4" />}
                          </Button>
                        )}
                        {rowActions?.(row)}
                        {canEdit && activeEditFields.length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditClick(row)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(row)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {rows.length === 0
            ? "No records"
            : `${total} row${total === 1 ? "" : "s"} total.`}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${runtimePageSize}`}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={`${runtimePageSize}`} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              className="hidden h-8 w-8 lg:flex"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden h-8 w-8 lg:flex"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Create modal */}
      {canCreate && createFields.length > 0 && (
        <CreateModal
          isOpen={showCreateModal}
          isLoading={isCreating}
          title={`Add ${title ?? resource}`}
          onSubmit={handleCreateSubmit}
          onClose={() => setShowCreateModal(false)}
        >
          {createFields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={formData[field.key]}
              onChange={setField(field.key)}
              isEditMode={false}
            />
          ))}
        </CreateModal>
      )}

      {/* Edit modal */}
      {canEdit && activeEditFields.length > 0 && (
        <EditModal
          isOpen={editingRow !== null}
          isLoading={isUpdating}
          title={`Edit ${title ?? resource}`}
          onSubmit={handleEditSubmit}
          onClose={() => setEditingRow(null)}
        >
          {activeEditFields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={formData[field.key]}
              onChange={setField(field.key)}
              isEditMode
            />
          ))}
        </EditModal>
      )}

      {/* Delete confirm dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        isLoading={isDeleting}
        title="Delete record?"
        message="This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Side panel */}
      {sidePanel && (
        <SidePanel
          isOpen={sidePanelRow !== null}
          onClose={() => { setSidePanelRow(null); tableQuery.refetch(); }}
          title={sidePanelRow ? sidePanel.title : ""}
          width={sidePanel.width}
        >
          {sidePanelRow && sidePanel.view(sidePanelRow)}
        </SidePanel>
      )}
    </div>
  );
}
