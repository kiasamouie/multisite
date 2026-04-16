"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@repo/lib/supabase/browser";
import { useAdmin } from "@/context/admin-context";
import { PageHeader, ReadOnlyField, DetailLayout } from "@/components/common";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Skeleton } from "@repo/ui/skeleton";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PageRecord {
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

export default function PageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { tenantId } = useAdmin();
  const isSuper = tenantId === null;
  const pageId = Number(params.id);

  const [page, setPage] = useState<PageRecord | null>(null);
  const [sections, setSections] = useState<SectionRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsageType, setNewUsageType] = useState("");
  const [addingBlock, setAddingBlock] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const select = isSuper ? "*, tenants(id, name, domain)" : "*";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("pages")
        .select(select)
        .eq("id", pageId)
        .single();
      if (error || !data) throw new Error("Not found");
      setPage(data);
    } catch {
      setPage(null);
    } finally {
      setLoading(false);
    }
  }, [pageId, isSuper]);

  const loadSections = useCallback(async () => {
    setLoadingSections(true);
    try {
      const res = await fetch(`/api/pages/${pageId}/sections`);
      if (res.ok) setSections(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoadingSections(false);
    }
  }, [pageId]);

  useEffect(() => {
    fetchPage();
    loadSections();
  }, [fetchPage, loadSections]);

  const handleAddBlock = async () => {
    const usageType = newUsageType.trim();
    if (!usageType) return;
    setAddingBlock(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/admin/pages/${pageId}/page-media-block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usage_type: usageType }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
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

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col gap-6 py-2">
        <PageHeader
          title="Page Not Found"
          actions={
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/pages")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          }
        />
      </div>
    );
  }

  const allBlocks = sections?.flatMap((s) => s.blocks).sort((a, b) => a.position - b.position) ?? [];

  const main = (
    <div className="space-y-6">
      {/* Page info */}
      <div className="space-y-4 rounded-xl bg-muted/40 p-5">
        <ReadOnlyField label="Title" value={page.title} />
        <ReadOnlyField label="Slug">
          <span className="font-mono text-muted-foreground">{page.slug}</span>
        </ReadOnlyField>
        <ReadOnlyField label="Status">
          <Badge variant={page.is_published ? "default" : "secondary"}>
            {page.is_published ? "Published" : "Draft"}
          </Badge>
        </ReadOnlyField>
        {page.is_homepage && <ReadOnlyField label="Homepage" value="Yes" />}
        {isSuper && page.tenants && (
          <ReadOnlyField label="Tenant">
            <p className="text-sm font-medium">{page.tenants.name}</p>
            <p className="text-xs text-muted-foreground">{page.tenants.domain}</p>
          </ReadOnlyField>
        )}
        <ReadOnlyField label="Created" value={new Date(page.created_at).toLocaleString()} />
        <ReadOnlyField label="Updated" value={new Date(page.updated_at).toLocaleString()} />
      </div>

      {/* Blocks */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blocks</h3>
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

  const sidebar = (
    <div className="space-y-4 rounded-xl bg-muted/40 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sections</span>
          <span className="font-medium">{sections?.length ?? 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Blocks</span>
          <span className="font-medium">{allBlocks.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <Badge variant={page.is_published ? "default" : "secondary"} className="text-xs">
            {page.is_published ? "Published" : "Draft"}
          </Badge>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageHeader
        title={page.title}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/pages")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pages
          </Button>
        }
      />
      <DetailLayout main={main} sidebar={sidebar} />
    </div>
  );
}
