"use client";

import { useCallback, useMemo } from "react";
import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import "./puck-theme.css";
import { buildPuckConfig } from "@/lib/puck/config";
import type { PuckData } from "@/lib/puck/adapter";
import { buildTenantUrl } from "@/lib/url";
import { Button } from "@repo/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface PuckEditorProps {
  pageId: number;
  pageTitle: string;
  initialData: PuckData;
  tenantId: number;
  tenantDomain: string;
  pageSlug: string;
}

export function PuckEditor({ pageId, pageTitle, initialData, tenantId, tenantDomain, pageSlug }: PuckEditorProps) {
  const puckConfig = useMemo(() => buildPuckConfig(tenantId), [tenantId]);
  const viewPageUrl = tenantDomain ? buildTenantUrl(tenantDomain, pageSlug) : null;
  const handlePublish = useCallback(
    async (data: PuckData) => {
      try {
        const res = await fetch(`/api/admin/pages/${pageId}/puck`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });

        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(err.error ?? "Failed to save");
          return;
        }

        toast.success("Page published successfully");
      } catch {
        toast.error("Network error while saving");
      }
    },
    [pageId]
  );

  return (
    <div className="puck-root" style={{ height: "100vh" }}>
      <Puck
        config={puckConfig}
        data={initialData}
        onPublish={handlePublish}
        headerTitle={pageTitle}
        headerPath={`/admin/pages/${pageId}/edit`}
        overrides={{
          headerActions: ({ children }) => (
            <div className="flex items-center gap-2">
              {viewPageUrl && (
                <a href={viewPageUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Page
                  </Button>
                </a>
              )}
              {children}
            </div>
          ),
        }}
      />
    </div>
  );
}
