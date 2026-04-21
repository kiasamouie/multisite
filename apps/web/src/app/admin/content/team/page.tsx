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

interface TeamMember extends Record<string, unknown> {
  id: number;
  tenant_id: number;
  name: string;
  role: string | null;
  bio: string | null;
  image_id: number | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export default function TeamPage() {
  const { tenantId } = useAdmin();
  const [search, setSearch] = useState("");

  const filters = useMemo<SupabaseFilter[]>(() => {
    const f: SupabaseFilter[] = [];
    if (tenantId) f.push({ field: "tenant_id", operator: "eq", value: tenantId });
    if (search) f.push({ field: "name", operator: "contains", value: search });
    return f;
  }, [tenantId, search]);

  const list = useSupabaseList<TeamMember>({
    resource: "team_members",
    filters,
    sorters: [{ field: "sort_order", order: "asc" }],
    enabled: !!tenantId,
  });

  const crud = useCrudPanel<TeamMember>();

  const columns: Column<TeamMember>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "role", label: "Role", render: (v) => v?.role || "—" },
    {
      key: "is_active",
      label: "Status",
      render: (v) => (
        <span className={v.is_active ? "text-green-600" : "text-muted-foreground"}>
          {v.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    { key: "sort_order", label: "Order" },
  ];

  async function handleSave(form: FormData) {
    crud.setSubmitting(true);
    try {
      const payload = {
        tenantId,
        name: form.get("name") as string,
        role: form.get("role") as string || null,
        bio: form.get("bio") as string || null,
        image_url: form.get("image_url") as string || null,
        sort_order: parseInt(form.get("sort_order") as string) || 0,
        is_active: form.get("is_active") === "on",
      };

      const url = "/api/admin/content/team";
      const method = crud.mode === "edit" && crud.item ? "PUT" : "POST";
      const body = method === "PUT" ? { ...payload, id: crud.item!.id } : payload;

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Save failed"); }

      toast.success(crud.mode === "edit" ? "Team member updated" : "Team member created");
      crud.closePanel();
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      crud.setSubmitting(false);
    }
  }

  async function handleDelete(item: TeamMember) {
    try {
      const res = await fetch(`/api/admin/content/team?id=${item.id}&tenantId=${tenantId}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Delete failed"); }
      toast.warning("Team member deleted");
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageHeader
        title="Team Members"
        actions={
          <Button onClick={() => crud.openPanel("create")} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Member
          </Button>
        }
      />

      <DataView
        columns={columns}
        data={list.data}
        loading={list.isLoading}
        mode="table"
        emptyMessage="No team members found."
        filter={{ search, onSearchChange: setSearch, searchPlaceholder: "Search by name\u2026" }}
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        onRefresh={() => list.invalidate()}
        onRowClick={(item) => crud.openPanel("edit", item)}
        canDelete
        deleteConfig={{
          onConfirm: handleDelete,
          title: "Delete team member?",
          description: "This will permanently remove this team member.",
        }}
      />

      <CrudModal
        open={crud.open}
        onOpenChange={() => crud.closePanel()}
        title={crud.mode === "edit" ? "Edit Team Member" : "Add Team Member"}
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
            <Label htmlFor="bio">Bio</Label>
            <Input id="bio" name="bio" defaultValue={crud.item?.bio ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input id="image_url" name="image_url" defaultValue={crud.item?.image_url ?? ""} />
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
