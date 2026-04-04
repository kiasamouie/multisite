"use client";

import { useTable, useCreate, useUpdate, useDelete } from "@refinedev/core";
import { useState } from "react";
import { PageHeader, CreateModal, EditModal } from "@repo/ui/admin";

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
 *
 * @example
 *   <Resource
 *     resource="tenants"
 *     title="Tenants"
 *     columns={[
 *       { key: "name",         label: "Name" },
 *       { key: "plan",         label: "Plan",    render: PlanBadgeCell },
 *       { key: "admin_enabled",label: "Status",  render: StatusCell },
 *       { key: "created_at",   label: "Created", render: DateCell },
 *     ]}
 *     createFields={[
 *       { key: "name", label: "Name", type: "text", required: true },
 *     ]}
 *     defaultValues={{ name: "" }}
 *     searchField="name"
 *     canSort
 *   />
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
  // Tracks the PK of each joined row for the row currently being edited.
  // Key = JoinDef.resource, value = the join row's PK (or undefined if no row exists yet).
  const [joinRowIds, setJoinRowIds] = useState<Record<string, unknown>>({});

  // ── Refine hooks ──────────────────────────────────────────────────────────
  const {
    tableQuery,
    setFilters,
    currentPage,
    setCurrentPage,
    pageCount,
    sorters,
    setSorters,
  } = useTable<T>({
    resource,
    pagination: { pageSize },
    syncWithLocation,
    meta: select ? { select } : undefined,
    filters: filters ? { initial: filters } : undefined,
  });

  const { mutate: createRecord } = useCreate();
  const { mutate: updateRecord } = useUpdate();
  const { mutate: deleteRecord } = useDelete();

  // ── Join helpers ──────────────────────────────────────────────────────────
  /**
   * Splits formData into a main-table payload and per-joined-table payloads.
   * Fields with `joinResource` are grouped by that resource; all others go to main.
   */
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
  const totalPages = pageCount || Math.ceil(total / pageSize) || 1;
  const activeEditFields = editFields ?? createFields;
  const showActionsCol =
    (canEdit && activeEditFields.length > 0) || canDelete || !!rowActions || !!sidePanel;
  const colCount = columns.length + (showActionsCol ? 1 : 0);
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

  const sortIndicator = (key: string) => {
    const s = sorters.find((s) => s.field === key);
    if (!s) return <span className="ml-1 opacity-30">↕</span>;
    return (
      <span className="ml-1 text-blue-600">{s.order === "asc" ? "↑" : "↓"}</span>
    );
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
        // Extract value from the nested joined data on the row
        const jd = joins?.find((j) => j.resource === field.joinResource);
        if (jd) {
          const raw = row[jd.resource];
          const joinData = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | undefined;
          initial[field.key] = joinData?.[field.key];
          // Track this join row's PK so we can update vs insert on submit
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
    <div className="space-y-4 p-8">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        {title && <PageHeader title={title} subtitle={computedSubtitle} />}
        <div className="flex shrink-0 items-center gap-2">
          {canExport && (
            <button
              disabled
              title="Export coming soon"
              className="rounded-lg border border-input px-4 py-2 text-sm text-muted-foreground opacity-50"
            >
              Export CSV
            </button>
          )}
          {canCreate && createFields.length > 0 && (
            <button
              onClick={handleCreateOpen}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {createLabel}
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      {canSearch && searchField && (
        <input
          type="text"
          placeholder={searchPlaceholder ?? `Search ${title ?? resource}…`}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {/* Error banner */}
      {tableQuery.isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Error loading {title ?? resource}:{" "}
          {tableQuery.error?.message ?? "Unknown error"}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left font-medium ${
                      canSort && col.sortable
                        ? "cursor-pointer select-none hover:text-foreground"
                        : ""
                    }`}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => canSort && col.sortable && handleSort(col.key)}
                  >
                    {col.label}
                    {canSort && col.sortable && sortIndicator(col.key)}
                  </th>
                ))}
                {(showActionsCol || canRefresh) && (
                  <th className="px-4 py-3 text-right font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {showActionsCol && "Actions"}
                      {canRefresh && (
                        <button
                          onClick={() => tableQuery.refetch()}
                          disabled={tableQuery.isFetching}
                          title="Refresh"
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
                        >
                          <span className={`material-symbols-outlined text-[16px] ${tableQuery.isFetching ? "animate-spin" : ""}`}>
                            refresh
                          </span>
                        </button>
                      )}
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {tableQuery.isLoading ? (
                <SkeletonRows cols={colCount} rows={Math.min(pageSize, 5)} />
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No records found
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={String(row.id)}
                    className="border-b last:border-0 hover:bg-muted/50"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        {col.render
                          ? col.render(row[col.key], row)
                          : String(row[col.key] ?? "")}
                      </td>
                    ))}
                    {showActionsCol && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {sidePanel && (
                            <button
                              onClick={() => setSidePanelRow(row)}
                              title={sidePanel.title}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {sidePanel.icon ?? "open_in_new"}
                              </span>
                            </button>
                          )}
                          {canEdit && activeEditFields.length > 0 && (
                            <button
                              onClick={() => handleEditClick(row)}
                              title="Edit"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteTarget(row)}
                              title="Delete"
                              className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                          {rowActions?.(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t bg-muted/50 px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {rows.length === 0
              ? "No records"
              : `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(
                  currentPage * pageSize,
                  total,
                )} of ${total}`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="rounded border border-input px-2 py-1 text-xs hover:bg-muted disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="rounded border border-input px-2 py-1 text-xs hover:bg-muted disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
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
