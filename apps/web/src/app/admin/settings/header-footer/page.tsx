import { redirect } from "next/navigation";

/**
 * The header & footer editor is a Puck-based visual editor that already
 * lives at /admin/header-footer. We expose it under /admin/settings as a
 * familiar entry point so all site-wide settings are reachable from one
 * place — the underlying URL is preserved for back-compat with any
 * bookmarks or admin nav config.
 */
export default function HeaderFooterRedirect() {
  redirect("/admin/header-footer");
}
