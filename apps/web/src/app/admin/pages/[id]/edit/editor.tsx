"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import "./puck-theme.css";
import { buildPuckConfig } from "@/lib/puck/config";
import type { PuckData } from "@/lib/puck/adapter";
import { buildTenantUrl } from "@/lib/url";
import { Button } from "@repo/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageMediaProvider } from "@repo/template/renderer/context";
import type { PageMediaAsset } from "@repo/template/types";
import { EditorLibraryProvider } from "@/lib/puck/EditorLibraryProvider";

interface PuckEditorProps {
  pageId: number;
  pageTitle: string;
  initialData: PuckData;
  tenantId: number;
  tenantDomain: string;
  pageSlug: string;
  pageMedia?: PageMediaAsset[];
  variant?: "page" | "site_header";
  hideViewPage?: boolean;
  /** HSL tuple overrides ("H S% L%") for Tailwind admin theme tokens, derived
   *  from the tenant's saved theme palette. Applied only to the Puck canvas
   *  preview area so blocks render with the tenant's colors. The surrounding
   *  Puck chrome (toolbar, fields panel) keeps the user's admin theme. */
  tenantThemeVars?: Record<string, string>;
  /** Tenant's saved theme mode — applies `.dark` to the canvas preview only. */
  tenantThemeMode?: "light" | "dark";
}

export function PuckEditor({
  pageId,
  pageTitle,
  initialData,
  tenantId,
  tenantDomain,
  pageSlug,
  pageMedia = [],
  variant = "page",
  hideViewPage = false,
  tenantThemeVars = {},
  tenantThemeMode = "light",
}: PuckEditorProps) {
  const puckConfig = useMemo(() => buildPuckConfig(tenantId, variant), [tenantId, variant]);

  // For the Header & Footer page, force the root content to exactly
  // [site_header, site_footer] in that order, injecting defaults if missing
  // and discarding any stray blocks. This guarantees the footer is always
  // pinned to the bottom of the Puck canvas and the editor cannot be
  // populated with arbitrary components.
  const normalizedData = useMemo<PuckData>(() => {
    if (variant !== "site_header") return initialData;

    const existing = Array.isArray(initialData?.content)
      ? initialData.content
      : [];
    const findByType = (t: string) =>
      existing.find(
        (b) => typeof b === "object" && b !== null && (b as { type?: string }).type === t,
      ) as { type: string; props: Record<string, unknown> } | undefined;

    const makeDefault = (type: "site_header" | "site_footer") => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const defProps = (puckConfig.components as any)?.[type]?.defaultProps ?? {};
      return {
        type,
        props: {
          id: `${type}-${Math.random().toString(36).slice(2, 8)}`,
          ...defProps,
        },
      };
    };

    const header = findByType("site_header") ?? makeDefault("site_header");
    const footer = findByType("site_footer") ?? makeDefault("site_footer");
    // Editor-only spacer between the header and footer so the footer
    // visually pins to the bottom of the canvas. Stripped on save by the
    // backend (see /api/admin/pages/[id]/puck) — never written back to
    // real `blocks` rows.
    const placeholder = makeDefault(
      "page_content_placeholder" as "site_header" | "site_footer",
    );

    return {
      ...initialData,
      content: [header, placeholder, footer],
      root: initialData?.root ?? { props: {} },
    } as PuckData;
  }, [variant, initialData, puckConfig]);

  // buildTenantUrl reads window.location.port — defer to client-only mount
  // to avoid SSR/CSR hydration mismatch.
  const [viewPageUrl, setViewPageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (tenantDomain) setViewPageUrl(buildTenantUrl(tenantDomain, pageSlug));
  }, [tenantDomain, pageSlug]);
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

  const isHeaderVariant = variant === "site_header";

  // Build a scoped CSS rule that overrides the admin theme tokens *only*
  // inside the Puck canvas preview area. The canvas is identified by Puck's
  // hashed class prefix `_PuckCanvas_*` (stable across patch versions).
  // This scope keeps the surrounding chrome (toolbar, fields panel,
  // component library) on the user's admin theme.
  const tenantScopeId = `puck-tenant-${pageId}`;
  const tenantThemeCss = useMemo(() => {
    const entries = Object.entries(tenantThemeVars);
    if (entries.length === 0) return "";
    const decls = entries.map(([k, v]) => `${k}: ${v};`).join(" ");
    return `#${tenantScopeId} [class*="PuckCanvas"], #${tenantScopeId} [class*="PuckPreview"] { ${decls} }`;
  }, [tenantThemeVars, tenantScopeId]);

  return (
    <div
      id={tenantScopeId}
      className="puck-root"
      data-variant={variant}
      data-tenant-theme={tenantThemeMode}
      style={{ height: "100vh" }}
    >
      {tenantThemeCss && (
        <style dangerouslySetInnerHTML={{ __html: tenantThemeCss }} />
      )}
      <EditorLibraryProvider tenantId={tenantId}>
        <PageMediaProvider assets={pageMedia}>
        <Puck
          config={puckConfig}
          data={normalizedData}
          onPublish={handlePublish}
          headerTitle={pageTitle}
          headerPath={`/admin/pages/${pageId}/edit`}
          iframe={{ enabled: false }}
          {...(isHeaderVariant ? { ui: { leftSideBarVisible: false } } : {})}
          overrides={{
            headerActions: ({ children }) => (
              <div className="flex items-center gap-2">
                {!hideViewPage && viewPageUrl && (
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
            // On the Header & Footer page, hide the component library
            // entirely — tenants cannot pick, drag, or drop any new
            // components onto the canvas. Only the existing site_header
            // and site_footer blocks remain and can only be edited.
            ...(isHeaderVariant
              ? {
                  components: () => <></>,
                  drawer: () => <></>,
                  drawerItem: () => <></>,
                  actionBar: () => <></>,
                }
              : {}),
          }}
        />
      </PageMediaProvider>
      </EditorLibraryProvider>
    </div>
  );
}
