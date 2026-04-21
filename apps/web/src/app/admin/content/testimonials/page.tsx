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

interface Testimonial extends Record<string, unknown> {
  id: number;
  tenant_id: number;
  name: string;
  role: string | null;
  content: string;
  avatar_id: number | null;
  avatar_url: string | null;
  rating: number | null;
  is_active: boolean;
  created_at: string;
}

export default function TestimonialsPage() {
  const { tenantId } = useAdmin();
  const [search, setSearch] = useState("");

  const filters = useMemo<SupabaseFilter[]>(() => {
    const f: SupabaseFilter[] = [];
    if (tenantId) f.push({ field: "tenant_id", operator: "eq", value: tenantId });
    if (search) f.push({ field: "name", operator: "contains", value: search });
    return f;
  }, [tenantId, search]);

  const list = useSupabaseList<Testimonial>({
    resource: "testimonials",
    filters,
    sorters: [{ field: "created_at", order: "desc" }],
    enabled: !!tenantId,
  });

  const crud = useCrudPanel<Testimonial>();

  const columns: Column<Testimonial>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "role", label: "Role", render: (v) => v?.role || "—" },
    { key: "rating", label: "Rating", render: (v) => v.rating ? `${"★".repeat(v.rating)}` : "—" },
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
        name: form.get("name") as string,
        role: form.get("role") as string || null,
        content: form.get("content") as string,
        avatar_url: form.get("avatar_url") as string || null,
        rating: parseInt(form.get("rating") as string) || null,
        is_active: form.get("is_active") === "on",
      };

      const url = "/api/admin/content/testimonials";
      const method = crud.mode === "edit" && crud.item ? "PUT" : "POST";
      const body = method === "PUT" ? { ...payload, id: crud.item!.id } : payload;

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Save failed"); }

      toast.success(crud.mode === "edit" ? "Testimonial updated" : "Testimonial created");
      crud.closePanel();
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      crud.setSubmitting(false);
    }
  }

  async function handleDelete(item: Testimonial) {
    try {
      const res = await fetch(`/api/admin/content/testimonials?id=${item.id}&tenantId=${tenantId}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Delete failed"); }
      toast.warning("Testimonial deleted");
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageHeader
        title="Testimonials"
        actions={
          <Button onClick={() => crud.openPanel("create")} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Testimonial
          </Button>
        }
      />

      <DataView
        columns={columns}
        data={list.data}
        loading={list.isLoading}
        mode="table"
        emptyMessage="No testimonials found."
        filter={{ search, onSearchChange: setSearch, searchPlaceholder: "Search by name\u2026" }}
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        onRefresh={() => list.invalidate()}
        onRowClick={(item) => crud.openPanel("edit", item)}
        canDelete
        deleteConfig={{
          onConfirm: handleDelete,
          title: "Delete testimonial?",
          description: "This will permanently remove this testimonial.",
        }}
      />

      <CrudModal
        open={crud.open}
        onOpenChange={() => crud.closePanel()}
        title={crud.mode === "edit" ? "Edit Testimonial" : "Add Testimonial"}
        mode={crud.mode}
      >
        <form action={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required defaultValue={crud.item?.name ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input id="role" name="role" defaultValue={crud.item?.role ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Quote *</Label>
            <Input id="content" name="content" required defaultValue={crud.item?.content ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar_url">Avatar URL</Label>
            <Input id="avatar_url" name="avatar_url" defaultValue={crud.item?.avatar_url ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rating">Rating (1-5)</Label>
            <Input id="rating" name="rating" type="number" min={1} max={5} defaultValue={crud.item?.rating ?? ""} />
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
