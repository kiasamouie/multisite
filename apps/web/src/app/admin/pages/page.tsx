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
  StatusBadge,
  ReadOnlyField,
} from "@/components/common";
import type { Column } from "@repo/ui/admin/components";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface PageRecord extends Record<string, unknown> {
  id: number;
  tenant_id: number;
  slug: string;
  title: string;
  is_published: boolean;
  is_homepage: boolean;
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

      {canUsePuck && (
        <Button size="sm" variant="outline" className="w-full" onClick={() => router.push(`/admin/pages/${page.id}/edit`)}>
          <Pencil className="mr-2 h-4 w-4" />
          Open Visual Editor
        </Button>
      )}

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

  const filters = useMemo<SupabaseFilter[]>(() => {
    const f: SupabaseFilter[] = [];
    if (!isSuper) f.push({ field: "tenant_id", operator: "eq", value: tenantId });
    if (search.trim()) f.push({ field: "title", operator: "contains", value: search });
    return f;
  }, [tenantId, isSuper, search]);

  const list = useSupabaseList<PageRecord>({
    resource: "pages",
    select: isSuper ? "*, tenants(id, name, domain)" : "*",
    filters,
  });

  const crud = useCrudPanel<PageRecord>();
  const { deleteRecord } = useSupabaseDelete("pages");
  // Form state for create/edit
  const [formData, setFormData] = useState({ title: "", slug: "", is_published: false, is_homepage: false });

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

  const columns: Column<PageRecord>[] = [
    { key: "title", label: "Title", sortable: true },
    { key: "slug", label: "Slug", sortable: true },
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
    {
      key: "is_homepage",
      label: "Homepage",
      render: (row) => <span className="text-xs text-muted-foreground">{row.is_homepage ? "✓" : "—"}</span>,
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
    ...(canUsePuck
      ? [{
          key: "id" as const,
          label: "Editor",
          render: (row: PageRecord) => (
            <Link href={`/admin/pages/${row.id}/edit`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400">
              <Pencil className="h-3 w-3" /> Edit
            </Link>
          ),
        }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageHeader
        title={isSuper ? "All Pages" : "Pages"}
        actions={!isSuper ? <Button size="sm" onClick={openCreate}>+ Add Page</Button> : undefined}
      />

      <DataView
        columns={columns}
        data={list.data}
        loading={list.isLoading}
        onRefresh={() => { list.invalidate(); toast.info("Refreshed", { duration: 1500 }); }}
        filter={{ search, onSearchChange: setSearch, searchPlaceholder: "Search by title\u2026" }}
        mode="table"
        emptyMessage="No pages found."
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        viewHref={(row) => `/admin/pages/${row.id}`}
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
