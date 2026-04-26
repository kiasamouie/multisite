"use client";

import { useState, useMemo } from "react";
import { useAdmin } from "@/context/admin-context";
import {
  useSupabaseList,
  useCrudPanel,
  type SupabaseFilter,
} from "@/hooks/useSupabase";
import { PageHeader, DataView, CrudModal } from "@/components/common";
import type { Column } from "@repo/ui/admin/components";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Switch } from "@repo/ui/switch";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface PortfolioItem extends Record<string, unknown> {
  id: number;
  tenant_id: number;
  title: string;
  description: string | null;
  image_id: number | null;
  image_url: string | null;
  link: string | null;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  tenants?: { id: number; name: string };
}

export default function PortfolioPage() {
  const { tenantId } = useAdmin();
  const isSuper = tenantId === null;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");

  const tenantList = useSupabaseList<{ id: number; name: string } & Record<string, unknown>>({
    resource: "tenants",
    select: "id, name",
    enabled: isSuper,
    pageSize: 200,
  });

  const filters = useMemo<SupabaseFilter[]>(() => {
    const f: SupabaseFilter[] = [];
    if (!isSuper) f.push({ field: "tenant_id", operator: "eq", value: tenantId });
    if (isSuper && tenantFilter) f.push({ field: "tenant_id", operator: "eq", value: Number(tenantFilter) });
    if (search) f.push({ field: "title", operator: "contains", value: search });
    if (statusFilter !== "") f.push({ field: "is_active", operator: "eq", value: statusFilter === "active" });
    return f;
  }, [tenantId, isSuper, search, statusFilter, tenantFilter]);

  const list = useSupabaseList<PortfolioItem>({
    resource: "portfolio_items",
    select: isSuper ? "*, tenants(id, name)" : "*",
    filters,
    sorters: [{ field: "sort_order", order: "asc" }],
    enabled: true,
  });

  const crud = useCrudPanel<PortfolioItem>();

  const columns: Column<PortfolioItem>[] = [
    { key: "title", label: "Title", sortable: true },
    { key: "category", label: "Category", render: (v) => v?.category || "—" },
    ...(isSuper ? [{
      key: "tenants" as keyof PortfolioItem & string,
      label: "Tenant",
      render: (v: PortfolioItem) => <span className="text-xs">{v.tenants?.name ?? "—"}</span>,
    }] : []),
    { key: "sort_order", label: "Order" },
    {
      key: "is_active",
      label: "Status",
      render: (v) => (
        <span className={v.is_active ? "text-green-600" : "text-muted-foreground"}>
          {v.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  async function handleSave(form: FormData) {
    crud.setSubmitting(true);
    try {
      const payload = {
        tenantId,
        title: form.get("title") as string,
        description: form.get("description") as string || null,
        image_url: form.get("image_url") as string || null,
        link: form.get("link") as string || null,
        category: form.get("category") as string || null,
        sort_order: parseInt(form.get("sort_order") as string) || 0,
        is_active: form.get("is_active") === "on",
      };

      const url = "/api/admin/content/portfolio";
      const method = crud.mode === "edit" && crud.item ? "PUT" : "POST";
      const body = method === "PUT" ? { ...payload, id: crud.item!.id } : payload;

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Save failed"); }

      toast.success(crud.mode === "edit" ? "Portfolio item updated" : "Portfolio item created");
      crud.closePanel();
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      crud.setSubmitting(false);
    }
  }

  async function handleDelete(item: PortfolioItem) {
    try {
      const res = await fetch(`/api/admin/content/portfolio?id=${item.id}&tenantId=${tenantId}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Delete failed"); }
      toast.warning("Portfolio item deleted");
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageHeader
        title="Portfolio"
        actions={
          <Button onClick={() => crud.openPanel("create")} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        }
      />

      <DataView
        columns={columns}
        data={list.data}
        loading={list.isLoading}
        mode="table"
        emptyMessage="No portfolio items found."
        filter={{
          search,
          onSearchChange: setSearch,
          searchPlaceholder: "Search by title\u2026",
          filters: [
            ...(isSuper ? [{
              type: "combobox" as const,
              label: "Tenant",
              value: tenantFilter,
              onChange: setTenantFilter,
              options: tenantList.data.map(t => ({ value: String(t.id), label: String(t.name) })),
              placeholder: "All tenants",
              searchPlaceholder: "Search tenants…",
              width: "200px",
            }] : []),
            {
              type: "chips" as const,
              inline: true,
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "active",   label: "Active",   color: { bg: "hsl(var(--success)/0.1)", text: "hsl(var(--success))", border: "hsl(var(--success)/0.2)" } },
                { value: "inactive", label: "Inactive" },
              ],
            },
          ],
          hasFilters: search !== "" || statusFilter !== "" || tenantFilter !== "",
          onClear: () => { setSearch(""); setStatusFilter(""); setTenantFilter(""); },
        }}
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        pageSize={list.pageSize}
        onPageSizeChange={(s) => { list.setPageSize(s); list.setPage(1); }}
        onRefresh={() => list.invalidate()}
        onRowClick={(item) => crud.openPanel("edit", item)}
        canDelete
        deleteConfig={{
          onConfirm: handleDelete,
          title: "Delete portfolio item?",
          description: "This will permanently remove this portfolio item.",
        }}
      />

      <CrudModal
        open={crud.open}
        onOpenChange={() => crud.closePanel()}
        title={crud.mode === "edit" ? "Edit Portfolio Item" : "Add Portfolio Item"}
        mode={crud.mode}
      >
        <form action={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" required defaultValue={crud.item?.title ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={crud.item?.description ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input id="image_url" name="image_url" defaultValue={crud.item?.image_url ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link">Link</Label>
            <Input id="link" name="link" defaultValue={crud.item?.link ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" defaultValue={crud.item?.category ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sort_order">Sort Order</Label>
            <Input id="sort_order" name="sort_order" type="number" defaultValue={crud.item?.sort_order ?? 0} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="is_active" name="is_active" defaultChecked={crud.item?.is_active ?? true} />
            <Label htmlFor="is_active">Active</Label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => crud.closePanel()}>Cancel</Button>
            <Button type="submit" disabled={crud.submitting}>
              {crud.submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </CrudModal>
    </div>
  );
}
