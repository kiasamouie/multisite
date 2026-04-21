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

interface ContentEvent extends Record<string, unknown> {
  id: number;
  tenant_id: number;
  name: string;
  description: string | null;
  date: string;
  venue: string | null;
  city: string | null;
  ticket_url: string | null;
  image_id: number | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

function formatDate(v: unknown): string {
  if (!v) return "—";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
}

export default function EventsPage() {
  const { tenantId } = useAdmin();
  const [search, setSearch] = useState("");

  const filters = useMemo<SupabaseFilter[]>(() => {
    const f: SupabaseFilter[] = [];
    if (tenantId) f.push({ field: "tenant_id", operator: "eq", value: tenantId });
    if (search) f.push({ field: "name", operator: "contains", value: search });
    return f;
  }, [tenantId, search]);

  const list = useSupabaseList<ContentEvent>({
    resource: "content_events",
    filters,
    sorters: [{ field: "date", order: "desc" }],
    enabled: !!tenantId,
  });

  const crud = useCrudPanel<ContentEvent>();

  const columns: Column<ContentEvent>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "date", label: "Date", render: (v) => formatDate(v.date) },
    { key: "venue", label: "Venue", render: (v) => v?.venue || "—" },
    { key: "city", label: "City", render: (v) => v?.city || "—" },
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
        description: form.get("description") as string || null,
        date: form.get("date") as string,
        venue: form.get("venue") as string || null,
        city: form.get("city") as string || null,
        ticket_url: form.get("ticket_url") as string || null,
        image_url: form.get("image_url") as string || null,
        is_active: form.get("is_active") === "on",
      };

      const url = "/api/admin/content/events";
      const method = crud.mode === "edit" && crud.item ? "PUT" : "POST";
      const body = method === "PUT" ? { ...payload, id: crud.item!.id } : payload;

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Save failed"); }

      toast.success(crud.mode === "edit" ? "Event updated" : "Event created");
      crud.closePanel();
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      crud.setSubmitting(false);
    }
  }

  async function handleDelete(item: ContentEvent) {
    try {
      const res = await fetch(`/api/admin/content/events?id=${item.id}&tenantId=${tenantId}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Delete failed"); }
      toast.warning("Event deleted");
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageHeader
        title="Events"
        actions={
          <Button onClick={() => crud.openPanel("create")} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Event
          </Button>
        }
      />

      <DataView
        columns={columns}
        data={list.data}
        loading={list.isLoading}
        mode="table"
        emptyMessage="No events found."
        filter={{ search, onSearchChange: setSearch, searchPlaceholder: "Search by name\u2026" }}
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        onRefresh={() => list.invalidate()}
        onRowClick={(item) => crud.openPanel("edit", item)}
        canDelete
        deleteConfig={{
          onConfirm: handleDelete,
          title: "Delete event?",
          description: "This will permanently remove this event.",
        }}
      />

      <CrudModal
        open={crud.open}
        onOpenChange={() => crud.closePanel()}
        title={crud.mode === "edit" ? "Edit Event" : "Add Event"}
        mode={crud.mode}
      >
        <form action={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required defaultValue={crud.item?.name ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={crud.item?.description ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input id="date" name="date" type="date" required defaultValue={crud.item?.date ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input id="venue" name="venue" defaultValue={crud.item?.venue ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={crud.item?.city ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket_url">Ticket URL</Label>
            <Input id="ticket_url" name="ticket_url" defaultValue={crud.item?.ticket_url ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input id="image_url" name="image_url" defaultValue={crud.item?.image_url ?? ""} />
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
