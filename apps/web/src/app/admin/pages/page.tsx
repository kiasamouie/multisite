"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@repo/lib/supabase/browser";
import { useAdmin } from "@/context/admin-context";
import {
  useSupabaseList,
  useSupabaseDelete,
  useCrudPanel,
  type SupabaseFilter,
} from "@/hooks/useSupabase";
import {
  PageHeader,
  DataView,
  CrudModal,
  EnumBadge,
  ReadOnlyField,
} from "@/components/common";
import type { Column } from "@repo/ui/admin/components";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Trash2, Pencil, LayoutTemplate, ExternalLink, PanelTop } from "lucide-react";
import { buildTenantUrl } from "@/lib/url";
import { toast } from "sonner";

interface PageRecord extends Record<string, unknown> {
  id: number;
  tenant_id: number;
  slug: string;
  title: string;
  is_published: boolean;
  is_homepage: boolean;
  page_type?: string | null;
  created_at: string;
  updated_at: string;
  tenants?: { id: number; name: string; domain: string };
}

interface BlockRecord {
  id: number;
  type: string;
  content: Record<string, unknown>;
  position: number;
}

interface SectionRecord {
  id: number;
  type: string;
  position: number;
  blocks: BlockRecord[];
}

function formatDate(v: unknown): string {
  if (!v) return "—";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
}

// ── Page details rendered inside CrudModal mode="view" ───────────────────────

function PageDetailsContent({ page }: { page: PageRecord }) {
  const { tenantId, plan } = useAdmin();
  const isSuper = tenantId === null;
  const canUsePuck = isSuper || plan === "growth" || plan === "pro";
  const router = useRouter();

  const [sections, setSections] = useState<SectionRecord[] | null>(null);
  const [loadingSections, setLoadingSections] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsageType, setNewUsageType] = useState("");
  const [addingBlock, setAddingBlock] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const loadSections = useCallback(async () => {
    setLoadingSections(true);
    try {
      const res = await fetch(`/api/pages/${page.id}/sections`);
      if (res.ok) setSections(await res.json());
    } catch { /* ignore */ } finally {
      setLoadingSections(false);
    }
  }, [page.id]);

  useEffect(() => { void loadSections(); }, [loadSections]);

  const handleAddBlock = async () => {
    const usageType = newUsageType.trim();
    if (!usageType) return;
    setAddingBlock(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/admin/pages/${page.id}/page-media-block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usage_type: usageType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setAddError(err.error ?? "Failed to add block");
        return;
      }
      setShowAddForm(false);
      setNewUsageType("");
      await loadSections();
      router.refresh();
      toast.success("Block added");
    } catch {
      toast.error("Failed to add block");
      setAddError("Network error");
    } finally {
      setAddingBlock(false);
    }
  };

  const handleDeleteBlock = async (blockId: number) => {
    try {
      await fetch(`/api/blocks/${blockId}`, { method: "DELETE" });
      await loadSections();
      router.refresh();
      toast.warning("Block deleted");
    } catch {
      toast.error("Failed to delete block");
    }
  };

  const allBlocks = sections?.flatMap((s) => s.blocks).sort((a, b) => a.position - b.position) ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <ReadOnlyField label="Title" value={page.title} />
        <ReadOnlyField label="Slug">
          <span className="font-mono text-muted-foreground">{page.slug}</span>
        </ReadOnlyField>
        <ReadOnlyField label="Status">
          <Badge variant={page.is_published ? "default" : "secondary"}>
            {page.is_published ? "Published" : "Draft"}
          </Badge>
        </ReadOnlyField>
        {page.is_homepage && <ReadOnlyField label="Homepage" value="✓ Yes, this is the homepage" />}
        {isSuper && page.tenants && (
          <ReadOnlyField label="Tenant">
            <p className="text-sm font-medium">{page.tenants.name}</p>
            <p className="text-xs text-muted-foreground">{page.tenants.domain}</p>
          </ReadOnlyField>
        )}
        <ReadOnlyField label="Created" value={new Date(page.created_at).toLocaleString()} />
        <ReadOnlyField label="Updated" value={new Date(page.updated_at).toLocaleString()} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {canUsePuck && (
          <Button size="sm" variant="outline" className="flex-1" onClick={() => router.push(`/admin/pages/${page.id}/edit`)}>
            <LayoutTemplate className="mr-2 h-4 w-4" />
            Open Visual Editor
          </Button>
        )}
        {(() => {
          const domain = isSuper
            ? page.tenants?.domain
            : typeof window !== "undefined" ? window.location.hostname : undefined;
          if (!domain) return null;
          const href = buildTenantUrl(domain, page.is_homepage ? "/" : `/${page.slug}`);
          return (
            <Button size="sm" variant="outline" className="flex-1" asChild>
              <a href={href} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Page
              </a>
            </Button>
          );
        })()}
      </div>

      {/* Blocks */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">Blocks</label>
          {!isSuper && (
            <button onClick={() => { setShowAddForm((f) => !f); setAddError(null); }} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
              + Add Page Media Block
            </button>
          )}
        </div>
        {loadingSections ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : allBlocks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No blocks on this page.</p>
        ) : (
          <div className="space-y-1">
            {allBlocks.map((block) => (
              <div key={block.id} className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{block.type}</span>
                  {block.type === "page_media" && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {String(block.content.usage_type ?? "")}
                    </span>
                  )}
                </div>
                {!isSuper && (
                  <button onClick={() => handleDeleteBlock(block.id)} className="text-xs text-muted-foreground hover:text-red-600 transition-colors" title="Delete block">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {showAddForm && (
          <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Enter the usage type — it must match what was selected when uploading media to this page.</p>
            <Input type="text" placeholder="usage type (e.g. general, hero, gallery)" value={newUsageType} onChange={(e) => setNewUsageType(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddBlock()} className="h-8 text-xs" />
            {addError && <p className="text-xs text-destructive">{addError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddBlock} disabled={addingBlock || !newUsageType.trim()}>{addingBlock ? "Adding…" : "Add"}</Button>
              <Button variant="outline" size="sm" onClick={() => { setShowAddForm(false); setAddError(null); setNewUsageType(""); }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function PagesPage() {
  const { tenantId, plan } = useAdmin();
  const isSuper = tenantId === null;
  const canUsePuck = isSuper || plan === "growth" || plan === "pro";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [tenantFilter, setTenantFilter] = useState("");
  const router = useRouter();

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
    if (search.trim()) f.push({ field: "title", operator: "contains", value: search });
    // multi-select: only filter when exactly one value is selected (can't OR in generic hook)
    if (statusFilter.length === 1) {
      if (statusFilter[0] === "published") f.push({ field: "is_published", operator: "eq", value: true });
      if (statusFilter[0] === "draft") f.push({ field: "is_published", operator: "eq", value: false });
    }
    return f;
  }, [tenantId, isSuper, search, statusFilter, tenantFilter]);

  const list = useSupabaseList<PageRecord>({
    resource: "pages",
    select: isSuper ? "*, tenants(id, name, domain)" : "*",
    filters,
    sorters: [
      { field: "sort_order", order: "asc" },
      { field: "created_at", order: "asc" },
    ],
    pageSize: 100,
  });

  const crud = useCrudPanel<PageRecord>();
  const { deleteRecord } = useSupabaseDelete("pages");
  const [savingOrder, setSavingOrder] = useState(false);
  // Form state for create/edit
  const [formData, setFormData] = useState({ title: "", slug: "", is_published: false, is_homepage: false });

  const handleSaveOrder = async (items: PageRecord[]) => {
    setSavingOrder(true);
    try {
      const orders = items.map((p, idx) => ({ id: p.id, sort_order: idx + 1 }));
      const res = await fetch("/api/admin/pages/sort-order", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? "Failed to save order");
      }
      toast.success("Order saved");
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save order");
      throw err;
    } finally {
      setSavingOrder(false);
    }
  };

  const openCreate = () => {
    setFormData({ title: "", slug: "", is_published: false, is_homepage: false });
    crud.openPanel("create");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    crud.setSubmitting(true);
    try {
      const supabase = createBrowserClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("pages").insert({ ...formData, tenant_id: tenantId });
      if (error) throw error;
      toast.success("Page created");
      crud.closePanel();
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      crud.setSubmitting(false);
    }
  };

  const handleEdit = async (row: PageRecord) => {
    crud.setSubmitting(true);
    try {
      const supabase = createBrowserClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("pages").update(formData).eq("id", row.id);
      if (error) throw error;
      toast.success("Page updated");
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      crud.setSubmitting(false);
    }
  };

  const handleDelete = async (row: PageRecord) => {
    try {
      await deleteRecord(row.id);
      toast.warning("Page deleted");
      list.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const visiblePages = list.data.filter((p) => p.page_type !== "site_header");

  const columns: Column<PageRecord>[] = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      render: (row) => <span>{row.title}</span>,
    },
    {
      key: "slug",
      label: "Slug",
      sortable: true,
      render: (row) => {
        const domain = isSuper
          ? row.tenants?.domain
          : typeof window !== "undefined" ? window.location.hostname : undefined;
        const href = domain
          ? buildTenantUrl(domain, row.is_homepage ? "/" : `/${row.slug}`)
          : `/${row.slug}`;
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            {row.slug}
          </a>
        );
      },
    },
    {
      key: "is_published",
      label: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant={row.is_published ? "default" : "secondary"}>
          {row.is_published ? "Published" : "Draft"}
        </Badge>
      ),
    },
    ...(isSuper
      ? [{
          key: "tenants" as const,
          label: "Tenant",
          render: (row: PageRecord) => <span className="text-xs">{row.tenants?.name ?? "—"}</span>,
        }]
      : []),
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      render: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.created_at)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageHeader
        title={isSuper ? "All Pages" : "Pages"}
        actions={!isSuper ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/header-footer">
                <PanelTop className="h-4 w-4" />
                Header &amp; Footer
              </Link>
            </Button>
            <Button size="sm" onClick={openCreate}>+ Add Page</Button>
          </div>
        ) : undefined}
      />

      <DataView
        columns={columns}
        data={visiblePages}
        loading={list.isLoading}
        onRefresh={list.invalidate}
        reorderable
        onSaveOrder={handleSaveOrder}
        savingOrder={savingOrder}
        filter={{
          search,
          onSearchChange: setSearch,
          searchPlaceholder: "Search by title…",
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
              multi: true,
              inline: true,
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                {
                  value: "published",
                  label: "Published",
                  color: { bg: "hsl(var(--success)/0.1)", text: "hsl(var(--success))", border: "hsl(var(--success)/0.2)" },
                },
                {
                  value: "draft",
                  label: "Draft",
                },
              ],
            },
          ],
          hasFilters: search !== "" || statusFilter.length > 0 || tenantFilter !== "",
          onClear: () => { setSearch(""); setStatusFilter([]); setTenantFilter(""); },
        }}
        mode="table"
        emptyMessage="No pages found."
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        pageSize={list.pageSize}
        onPageSizeChange={(s) => { list.setPageSize(s); list.setPage(1); }}
        rowActions={canUsePuck ? (row) => (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Visual Editor" asChild>
            <Link href={`/admin/pages/${row.id}/edit`}>
              <LayoutTemplate className="h-4 w-4" />
            </Link>
          </Button>
        ) : undefined}
        canView
        viewModal={{
          title: () => "Page Details",
          description: (row) => row.title,
          content: (row) => <PageDetailsContent page={row} />,
          size: "lg",
        }}
        canEdit={!isSuper}
        editModal={{
          title: () => "Edit Page",
          onOpen: (row) => setFormData({ title: row.title, slug: row.slug, is_published: row.is_published, is_homepage: row.is_homepage }),
          content: () => (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={formData.slug} onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))} required />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formData.is_published} onChange={(e) => setFormData((p) => ({ ...p, is_published: e.target.checked }))} className="accent-primary" />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formData.is_homepage} onChange={(e) => setFormData((p) => ({ ...p, is_homepage: e.target.checked }))} className="accent-primary" />
                  Homepage
                </label>
              </div>
            </div>
          ),
          onSubmit: handleEdit,
          submitting: crud.submitting,
          size: "md",
        }}
        canDelete={!isSuper}
        deleteConfig={{
          onConfirm: handleDelete,
          title: "Delete page?",
          description: "This action cannot be undone.",
        }}
      />

      {/* Create Modal */}
      <CrudModal
        open={crud.open}
        onOpenChange={() => crud.closePanel()}
        mode="create"
        title="Add Page"
        size="md"
        onSubmit={handleSubmit}
        submitting={crud.submitting}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" value={formData.slug} onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))} required />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formData.is_published} onChange={(e) => setFormData((p) => ({ ...p, is_published: e.target.checked }))} className="accent-primary" />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formData.is_homepage} onChange={(e) => setFormData((p) => ({ ...p, is_homepage: e.target.checked }))} className="accent-primary" />
              Homepage
            </label>
          </div>
        </div>
      </CrudModal>

    </div>
  );
}
