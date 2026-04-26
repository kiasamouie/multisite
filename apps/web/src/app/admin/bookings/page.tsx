"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/context/admin-context";
import { useCrudPanel, useSupabaseList } from "@/hooks/useSupabase";
import { PageHeader, DataView, CrudModal, EnumBadge } from "@/components/common";
import type { Column } from "@repo/ui/admin/components";
import { Button } from "@repo/ui/button";
import { Label } from "@repo/ui/label";
import { Input } from "@repo/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { toast } from "sonner";
import { Mail } from "lucide-react";

interface BookingRecord extends Record<string, unknown> {
  id: string;
  tenant_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  booking_date: string;
  booking_time: string;
  party_size: number;
  service_label: string | null;
  special_notes: string | null;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "noshow";
  created_at: string;
  updated_at: string;
  tenants?: { id: number; name: string; slug: string | null } | null;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
  { value: "noshow", label: "No-Show" },
] as const;



function formatDate(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

export default function BookingsPage() {
  const { tenantId } = useAdmin();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");

  // Show tenant column only in platform-wide view (super admin with no tenant scoping)
  const isCrossTenant = !tenantId;

  const tenantList = useSupabaseList<{ id: number; name: string } & Record<string, unknown>>({
    resource: "tenants",
    select: "id, name",
    enabled: isCrossTenant,
    pageSize: 200,
  });

  // Fetch via the service-role admin API route. This bypasses client-side
  // RLS (which requires an explicit membership row for the tenant) and
  // instead trusts server-side auth + platform/tenant scoping.
  const queryKey = ["admin-bookings", tenantId, tenantFilter, page];
  const list = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", String(tenantId));
      else if (tenantFilter) params.set("tenantId", tenantFilter);
      const res = await fetch(`/api/admin/bookings?${params}`);
      if (!res.ok) throw new Error("Failed to load bookings");
      const json = await res.json();
      const all = (json.data ?? []) as BookingRecord[];
      // Sort newest first by date+time
      all.sort((a, b) => {
        const aKey = `${a.booking_date}T${a.booking_time}`;
        const bKey = `${b.booking_date}T${b.booking_time}`;
        return bKey.localeCompare(aKey);
      });
      return all;
    },
  });

  const allData = list.data ?? [];

  // Client-side filter by search and status
  const filteredData = useMemo(() => {
    return allData.filter(row => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q ||
        row.customer_name.toLowerCase().includes(q) ||
        row.customer_email.toLowerCase().includes(q);
      const matchStatus = !statusFilter || row.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [allData, search, statusFilter]);

  const total = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const data = filteredData.slice((page - 1) * pageSize, page * pageSize);
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const crud = useCrudPanel<BookingRecord>();

  // isCrossTenant is already defined above

  const columns: Column<BookingRecord>[] = [
    {
      key: "booking_date",
      label: "Date & Time",
      sortable: true,
      render: (row) => (
        <span className="font-medium">
          {formatDate(row.booking_date)}{" "}
          <span className="text-muted-foreground">at {row.booking_time.slice(0, 5)}</span>
        </span>
      ),
    },
    ...(isCrossTenant ? [{
      key: "tenant_id" as const,
      label: "Tenant",
      render: (row: BookingRecord) => (
        <span className="text-sm text-muted-foreground">
          {row.tenants?.name ?? `Tenant #${row.tenant_id}`}
        </span>
      ),
    }] : []),
    {
      key: "customer_name",
      label: "Customer",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">{row.customer_name}</p>
          <p className="text-xs text-muted-foreground">{row.customer_email}</p>
        </div>
      ),
    },
    {
      key: "party_size",
      label: "Party",
      render: (row) => row.party_size,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <EnumBadge status={row.status} />
      ),
    },
  ];

  async function handleUpdate(form: FormData) {
    if (!crud.item) return;
    crud.setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { id: crud.item.id };
      const status = form.get("status") as BookingRecord["status"] | null;
      const bookingDate = form.get("booking_date") as string | null;
      const bookingTime = form.get("booking_time") as string | null;

      if (status) payload.status = status;
      if (bookingDate) payload.booking_date = bookingDate;
      if (bookingTime) payload.booking_time = bookingTime;

      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Update failed");
      }

      toast.success("Booking updated");
      crud.closePanel();
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      crud.setSubmitting(false);
    }
  }

  async function handleDelete(item: BookingRecord) {
    try {
      const res = await fetch(`/api/admin/bookings?id=${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Delete failed");
      }
      toast.warning("Booking deleted");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function handleResendEmail(item: BookingRecord) {
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to resend");
      }
      toast.success(`Emails resent to ${item.customer_email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend emails");
    }
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageHeader title="Bookings" />

      <DataView
        columns={columns}
        data={data}
        loading={list.isLoading}
        mode="table"
        emptyMessage="No bookings found."
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p)}
        onRefresh={() => invalidate()}
        onRowClick={(item) => crud.openPanel("edit", item)}
        filter={{
          search,
          onSearchChange: (v) => { setSearch(v); setPage(1); },
          searchPlaceholder: "Search by customer name or email…",
          filters: [
            ...(isCrossTenant ? [{
              type: "combobox" as const,
              label: "Tenant",
              value: tenantFilter,
              onChange: (v: string) => { setTenantFilter(v); setPage(1); },
              options: tenantList.data.map(t => ({ value: String(t.id), label: String(t.name) })),
              placeholder: "All tenants",
              searchPlaceholder: "Search tenants…",
              width: "200px",
            }] : []),
            {
              type: "chips" as const,
              inline: true,
              value: statusFilter,
              onChange: (v: string) => { setStatusFilter(v); setPage(1); },
              options: [
                { value: "pending",   label: "Pending",   color: { bg: "hsl(var(--warning)/0.1)",     text: "hsl(var(--warning))",     border: "hsl(var(--warning)/0.2)" } },
                { value: "confirmed", label: "Confirmed", color: { bg: "hsl(var(--success)/0.1)",     text: "hsl(var(--success))",     border: "hsl(var(--success)/0.2)" } },
                { value: "completed", label: "Completed", color: { bg: "hsl(var(--primary)/0.1)",     text: "hsl(var(--primary))",     border: "hsl(var(--primary)/0.2)" } },
                { value: "cancelled", label: "Cancelled" },
                { value: "noshow",    label: "No-Show" },
              ],
            },
          ],
          hasFilters: search !== "" || statusFilter !== "" || tenantFilter !== "",
          onClear: () => { setSearch(""); setStatusFilter(""); setTenantFilter(""); setPage(1); },
        }}
        canDelete
        deleteConfig={{
          onConfirm: handleDelete,
          title: "Delete booking?",
          description: "This will permanently remove this booking record.",
        }}
        rowActions={(item) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); handleResendEmail(item); }}
            title="Resend booking emails"
          >
            <Mail className="h-4 w-4" />
          </Button>
        )}
      />

      <CrudModal
        open={crud.open}
        onOpenChange={() => crud.closePanel()}
        title="Booking Details"
        mode={crud.mode}
      >
        {crud.item && (
          <form action={handleUpdate} className="space-y-4">
            {/* Read-only customer details */}
            <div className="rounded-md border p-4 space-y-1 bg-muted/40">
              <p className="text-sm font-medium">{crud.item.customer_name}</p>
              <p className="text-sm text-muted-foreground">{crud.item.customer_email}</p>
              {crud.item.customer_phone && (
                <p className="text-sm text-muted-foreground">{crud.item.customer_phone}</p>
              )}
              {crud.item.party_size > 1 && (
                <p className="text-sm text-muted-foreground">Party of {crud.item.party_size}</p>
              )}
              {crud.item.special_notes && (
                <p className="text-sm text-muted-foreground mt-2 italic">&ldquo;{crud.item.special_notes}&rdquo;</p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={crud.item.status}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="booking_date">Date</Label>
              <Input
                id="booking_date"
                name="booking_date"
                type="date"
                defaultValue={crud.item.booking_date}
              />
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label htmlFor="booking_time">Time</Label>
              <Input
                id="booking_time"
                name="booking_time"
                type="time"
                defaultValue={crud.item.booking_time.slice(0, 5)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => crud.closePanel()}>
                Cancel
              </Button>
              <Button type="submit" disabled={crud.submitting}>
                {crud.submitting ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </CrudModal>
    </div>
  );
}
