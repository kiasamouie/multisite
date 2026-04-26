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

interface BlogPost extends Record<string, unknown> {
  id: number;
  tenant_id: number;
  title: string;
  excerpt: string | null;
  body: string | null;
  image_id: number | null;
  image_url: string | null;
  author: string | null;
  slug: string | null;
  published_at: string | null;
  is_published: boolean;
  created_at: string;
  tenants?: { id: number; name: string };
}

function formatDate(v: unknown): string {
  if (!v) return "—";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
}

export default function BlogPage() {
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
    if (statusFilter !== "") f.push({ field: "is_published", operator: "eq", value: statusFilter === "published" });
    return f;
  }, [tenantId, isSuper, search, statusFilter, tenantFilter]);

  const list = useSupabaseList<BlogPost>({
    resource: "blog_posts",
    select: isSuper ? "*, tenants(id, name)" : "*",
    filters,
    sorters: [{ field: "created_at", order: "desc" }],
    enabled: true,
  });

  const crud = useCrudPanel<BlogPost>();

  const columns: Column<BlogPost>[] = [
    { key: "title", label: "Title", sortable: true },
    { key: "author", label: "Author", render: (v) => v?.author || "—" },
    ...(isSuper ? [{
      key: "tenants" as keyof BlogPost & string,
      label: "Tenant",
      render: (v: BlogPost) => <span className="text-xs">{v.tenants?.name ?? "—"}</span>,
    }] : []),
    { key: "published_at", label: "Published", render: (v) => formatDate(v.published_at) },
    {
      key: "is_published",
      label: "Status",
      render: (v) => (
        <span className={v.is_published ? "text-green-600" : "text-muted-foreground"}>
          {v.is_published ? "Published" : "Draft"}
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
        excerpt: form.get("excerpt") as string || null,
        body: form.get("body") as string || null,
        image_url: form.get("image_url") as string || null,
        author: form.get("author") as string || null,
        slug: form.get("slug") as string || null,
        published_at: form.get("published_at") as string || null,
        is_published: form.get("is_published") === "on",
      };

      const url = "/api/admin/content/blog";
      const method = crud.mode === "edit" && crud.item ? "PUT" : "POST";
      const body = method === "PUT" ? { ...payload, id: crud.item!.id } : payload;

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Save failed"); }

      toast.success(crud.mode === "edit" ? "Blog post updated" : "Blog post created");
      crud.closePanel();
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      crud.setSubmitting(false);
    }
  }

  async function handleDelete(item: BlogPost) {
    try {
      const res = await fetch(`/api/admin/content/blog?id=${item.id}&tenantId=${tenantId}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Delete failed"); }
      toast.warning("Blog post deleted");
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageHeader
        title="Blog Posts"
        actions={
          <Button onClick={() => crud.openPanel("create")} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Post
          </Button>
        }
      />

      <DataView
        columns={columns}
        data={list.data}
        loading={list.isLoading}
        mode="table"
        emptyMessage="No blog posts found."
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
                { value: "published", label: "Published", color: { bg: "hsl(var(--success)/0.1)", text: "hsl(var(--success))", border: "hsl(var(--success)/0.2)" } },
                { value: "draft",     label: "Draft" },
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
          title: "Delete blog post?",
          description: "This will permanently remove this blog post.",
        }}
      />

      <CrudModal
        open={crud.open}
        onOpenChange={() => crud.closePanel()}
        title={crud.mode === "edit" ? "Edit Blog Post" : "Add Blog Post"}
        mode={crud.mode}
      >
        <form action={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" required defaultValue={crud.item?.title ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" defaultValue={crud.item?.slug ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Input id="excerpt" name="excerpt" defaultValue={crud.item?.excerpt ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Input id="body" name="body" defaultValue={crud.item?.body ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input id="image_url" name="image_url" defaultValue={crud.item?.image_url ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="author">Author</Label>
            <Input id="author" name="author" defaultValue={crud.item?.author ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="published_at">Published Date</Label>
            <Input id="published_at" name="published_at" type="date" defaultValue={crud.item?.published_at?.split("T")[0] ?? ""} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="is_published" name="is_published" defaultChecked={crud.item?.is_published ?? false} />
            <Label htmlFor="is_published">Published</Label>
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
