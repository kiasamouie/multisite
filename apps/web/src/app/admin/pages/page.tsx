"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTenantAdmin, Resource, DateCell } from "@/components/admin";
import { Trash2, FileText } from "lucide-react";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";

interface PageRecord extends Record<string, unknown> {
  id: number;
  tenant_id: number;
  slug: string;
  title: string;
  is_published: boolean;
  is_homepage: boolean;
  created_at: string;
  updated_at: string;
  tenants?: {
    id: number;
    name: string;
    domain: string;
  };
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

function PageDetailsPanel({ page }: { page: PageRecord }) {
  const { tenantId } = useTenantAdmin();
  const isSuper = tenantId === null;
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
    } catch {
      // ignore network errors
    } finally {
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
    } catch {
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
    } catch {
      // ignore
    }
  };

  const allBlocks = sections?.flatMap((s) => s.blocks).sort((a, b) => a.position - b.position) ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground">Title</label>
          <p className="mt-1 text-sm font-medium">{page.title}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground">Slug</label>
          <p className="mt-1 text-sm font-mono text-muted-foreground">{page.slug}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground">Status</label>
          <div className="mt-1">
            <Badge variant={page.is_published ? "default" : "secondary"}>
              {page.is_published ? "Published" : "Draft"}
            </Badge>
          </div>
        </div>

        {page.is_homepage && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Homepage</label>
            <p className="mt-1 text-sm">✓ Yes, this is the homepage</p>
          </div>
        )}

        {isSuper && page.tenants && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Tenant</label>
            <div className="mt-1">
              <p className="text-sm font-medium">{page.tenants.name}</p>
              <p className="text-xs text-muted-foreground">{page.tenants.domain}</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground">Created</label>
          <p className="mt-1 text-sm">{new Date(page.created_at).toLocaleString()}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground">Updated</label>
          <p className="mt-1 text-sm">{new Date(page.updated_at).toLocaleString()}</p>
        </div>
      </div>

      {/* Blocks */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">Blocks</label>
          {!isSuper && (
            <button
              onClick={() => { setShowAddForm((f) => !f); setAddError(null); }}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
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
              <div
                key={block.id}
                className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{block.type}</span>
                  {block.type === "page_media" && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {String(block.content.usage_type ?? "")}
                    </span>
                  )}
                </div>
                {!isSuper && (
                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
                    title="Delete block"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {showAddForm && (
          <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              Enter the usage type — it must match what was selected when uploading media to this page.
            </p>
            <Input
              type="text"
              placeholder="usage type (e.g. general, hero, gallery)"
              value={newUsageType}
              onChange={(e) => setNewUsageType(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddBlock()}
              className="h-8 text-xs"
            />
            {addError && <p className="text-xs text-destructive">{addError}</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddBlock}
                disabled={addingBlock || !newUsageType.trim()}
              >
                {addingBlock ? "Adding…" : "Add"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowAddForm(false); setAddError(null); setNewUsageType(""); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PagesPage() {
  const { tenantId } = useTenantAdmin();
  const isSuper = tenantId === null;

  return (
    <Resource<PageRecord>
      resource="pages"
      title={isSuper ? "All Pages" : "Pages"}
      subtitle={isSuper ? "Manage pages across all tenants" : "Manage pages for this site"}
      searchField="title"
      searchPlaceholder="Search by title…"
      canCreate={!isSuper}
      canEdit={!isSuper}
      canDelete={!isSuper}
      canSort
      select={isSuper ? "*, tenants(id, name, domain)" : "*"}
      filters={isSuper ? undefined : [{ field: "tenant_id", operator: "eq", value: tenantId }]}
      columns={
        isSuper
          ? [
              { key: "title", label: "Title" },
              { key: "slug", label: "Slug" },
              {
                key: "is_published",
                label: "Status",
                render: (value) => {
                  const isPublished = Boolean(value);
                  return (
                    <Badge variant={isPublished ? "default" : "secondary"}>
                      {isPublished ? "Published" : "Draft"}
                    </Badge>
                  );
                },
              },
              {
                key: "is_homepage",
                label: "Homepage",
                render: (value) => {
                  return (
                    <span className="text-xs text-muted-foreground">
                      {Boolean(value) ? "✓" : "—"}
                    </span>
                  );
                },
              },
              {
                key: "tenants",
                label: "Tenant",
                render: (value, row: Record<string, unknown>) => {
                  const tenants = row.tenants as { name?: string } | undefined;
                  const tenantName = tenants?.name ? String(tenants.name) : "—";
                  return <span className="text-xs">{tenantName}</span>;
                },
              },
              { key: "created_at", label: "Created", render: DateCell, sortable: true },
            ]
          : [
              { key: "title", label: "Title" },
              { key: "slug", label: "Slug" },
              {
                key: "is_published",
                label: "Status",
                render: (value) => {
                  const isPublished = Boolean(value);
                  return (
                    <Badge variant={isPublished ? "default" : "secondary"}>
                      {isPublished ? "Published" : "Draft"}
                    </Badge>
                  );
                },
              },
              {
                key: "is_homepage",
                label: "Homepage",
                render: (value) => {
                  return (
                    <span className="text-xs text-muted-foreground">
                      {Boolean(value) ? "✓" : "—"}
                    </span>
                  );
                },
              },
              { key: "created_at", label: "Created", render: DateCell, sortable: true },
            ]
      }
      sidePanel={{
        icon: FileText,
        title: "Page Details",
        subtitle: (row) => (row as PageRecord).title,
        view: (row) => <PageDetailsPanel page={row as PageRecord} />,
        width: "md",
      }}
    />
  );
}
