"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/ui/button";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { X, Loader2 } from "lucide-react";

interface PageOption {
  id: number;
  title: string;
  slug: string;
}

interface Association {
  id: number;
  page_id: number;
  usage_type: string;
  pages?: {
    id: number;
    title: string;
    slug: string;
    tenants?: { id: number; name: string; domain: string } | null;
  };
}

interface TenantOption {
  id: number;
  name: string;
  domain: string;
}

interface MediaEditAssociationsProps {
  mediaId: number;
  tenantId: number;
  isSuper: boolean;
  onSave?: () => void;
  onCancel?: () => void;
}

/**
 * Media Edit Associations Panel
 * Allows managing page associations for existing media records.
 * Shows current associations and provides UI to add/remove pages.
 */
export function MediaEditAssociations({
  mediaId,
  tenantId,
  isSuper,
  onSave,
  onCancel,
}: MediaEditAssociationsProps) {

  const [pages, setPages] = useState<PageOption[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loadingAssociations, setLoadingAssociations] = useState(false);

  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [addingAssociation, setAddingAssociation] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removingAssociationId, setRemovingAssociationId] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Super admin only: tenant selection
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<number>(tenantId);

  // Load tenants (super admin only)
  useEffect(() => {
    if (!isSuper) return;
    setLoadingTenants(true);
    fetch("/api/admin/tenants?perPage=100")
      .then((r) => r.json())
      .then((data) => setTenants(data.tenants || []))
      .catch((err) => console.error("Failed to load tenants:", err))
      .finally(() => setLoadingTenants(false));
  }, [isSuper]);

  // Load pages for the selected tenant
  useEffect(() => {
    setLoadingPages(true);
    fetch(`/api/admin/pages?tenantId=${selectedTenantId}&fields=id,title,slug`)
      .then((r) => r.json())
      .then((data) => setPages(data.pages || []))
      .catch((err) => {
        console.error("Failed to load pages:", err);
        setPages([]);
      })
      .finally(() => setLoadingPages(false));
  }, [selectedTenantId]);

  // Load existing associations
  useEffect(() => {
    setLoadingAssociations(true);
    fetch(`/api/admin/media/${mediaId}/associations`)
      .then((r) => r.json())
      .then((data) => {
        setAssociations(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to load associations:", err);
        setAssociations([]);
      })
      .finally(() => setLoadingAssociations(false));
  }, [mediaId]);

  const existingPageIds = new Set(associations.map((a) => a.page_id));
  const availablePages = pages.filter((p) => !existingPageIds.has(p.id));

  const handleAddAssociation = async () => {
    if (!selectedPageId) {
      setAddError("Please select a page");
      return;
    }

    setAddingAssociation(true);
    setAddError(null);

    try {
      const response = await fetch(`/api/admin/media/${mediaId}/associations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: selectedPageId, usage_type: "pages" }),
      });

      if (!response.ok) {
        const error = await response.json();
        setAddError(error.error || "Failed to add association");
        return;
      }

      const newAssociation = await response.json();
      setAssociations((prev) => [...prev, newAssociation]);
      setSelectedPageId(null);
      onSave?.();
    } catch (error) {
      setAddError(error instanceof Error ? error.message : "Failed to add association");
    } finally {
      setAddingAssociation(false);
    }
  };

  const handleRemoveAssociation = async (associationId: number, pageId: number) => {
    setRemovingAssociationId(associationId);
    setRemoveError(null);

    try {
      const response = await fetch(`/api/admin/media/${mediaId}/associations`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: pageId }),
      });

      if (!response.ok) {
        const error = await response.json();
        setRemoveError(error.error || "Failed to remove association");
        return;
      }

      setAssociations((prev) => prev.filter((a) => a.id !== associationId));
      onSave?.();
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : "Failed to remove association");
    } finally {
      setRemovingAssociationId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Manage Page Associations</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Add or remove pages where this media is used.{isSuper ? " As platform admin, you can associate this media to pages across any tenant." : ""}
        </p>
      </div>

      {/* Tenant Selector — super admin only, shown at top level */}
      {isSuper && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <Label className="text-xs font-semibold mb-3 block">Target Tenant</Label>
          {loadingTenants ? (
            <p className="text-xs text-muted-foreground">Loading tenants...</p>
          ) : (
            <Select
              value={String(selectedTenantId)}
              onValueChange={(val) => {
                setSelectedTenantId(Number(val));
                setSelectedPageId(null);
              }}
              disabled={addingAssociation}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="— Select a tenant —" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name} ({t.domain})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            Pages below are loaded from the selected tenant.
          </p>
        </div>
      )}

      {/* Current Associations */}
      <div>
        <Label className="text-xs font-semibold mb-2 block">Current Associations</Label>
        {loadingAssociations ? (
          <p className="text-xs text-muted-foreground">Loading associations…</p>
        ) : associations.length === 0 ? (
          <p className="text-xs text-muted-foreground">Not used on any pages yet.</p>
        ) : (
          <div className="space-y-2">
            {associations.map((assoc) => (
              <div
                key={assoc.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/50 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">
                    {assoc.pages?.title || "Unknown Page"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {assoc.pages?.tenants?.domain
                      ? `${assoc.pages.tenants.domain}/${assoc.pages.slug || ""}`
                      : `/${assoc.pages?.slug || "unknown"}`}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveAssociation(assoc.id, assoc.page_id)}
                  disabled={removingAssociationId === assoc.id}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 transition-colors"
                  title="Remove association"
                >
                  {removingAssociationId === assoc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
            {removeError && (
              <p className="text-xs text-red-600 dark:text-red-400">{removeError}</p>
            )}
          </div>
        )}
      </div>

      {/* Add Association Section */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <Label className="text-xs font-semibold mb-3 block">Add Page</Label>

        <div className="space-y-3">
          {/* Page Selector */}
          <div className="space-y-1">
            <Label htmlFor="page-select" className="text-xs font-medium">
              Select Page
            </Label>
            {loadingPages ? (
              <p className="text-xs text-muted-foreground">Loading pages…</p>
            ) : availablePages.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {pages.length === 0
                  ? "No pages available. Create a page first."
                  : "This media is already used on all pages in this site."}
              </p>
            ) : (
              <Select
                value={selectedPageId != null ? String(selectedPageId) : ""}
                onValueChange={(val) => setSelectedPageId(val ? Number(val) : null)}
                disabled={addingAssociation}
              >
                <SelectTrigger id="page-select" className="w-full">
                  <SelectValue placeholder="— Select a page —" />
                </SelectTrigger>
                <SelectContent>
                  {availablePages.map((page) => (
                    <SelectItem key={page.id} value={String(page.id)}>
                      {page.title} <span className="text-muted-foreground">(/{page.slug})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Add Button */}
          {selectedPageId && availablePages.length > 0 && (
            <Button
              onClick={handleAddAssociation}
              disabled={addingAssociation || !selectedPageId}
              size="sm"
              className="w-full"
            >
              {addingAssociation ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Association"
              )}
            </Button>
          )}

          {addError && (
            <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t border-border">
        <Button
          onClick={onCancel}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          Close
        </Button>
        <Button
          onClick={onSave}
          size="sm"
          className="flex-1"
        >
          Done
        </Button>
      </div>
    </div>
  );
}
