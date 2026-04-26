import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createServerClient } from "@repo/lib/supabase/server";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { isPlatformAdmin } from "@repo/lib/tenant/platform";
import { getPageMedia } from "@repo/lib/media/resolve";
import { getSettings } from "@repo/lib/site-settings/read";
import { paletteToCssVars } from "@repo/lib/theme/palette";
import { dbToPuck } from "@/lib/puck/adapter";
import { PuckEditor } from "./editor";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPage({ params }: EditPageProps) {
  const { id } = await params;
  const pageId = parseInt(id, 10);
  if (isNaN(pageId)) notFound();

  // Auth check
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const isPlatform = await isPlatformAdmin(user.id);

  // Fetch the page with sections + blocks + tenant domain
  const { data: page, error } = await admin
    .from("pages")
    .select("id, title, slug, is_homepage, tenant_id, page_type, sections(*, blocks(*)), tenants(domain)")
    .eq("id", pageId)
    .single();

  if (error || !page) notFound();

  // Verify access: platform admin or tenant member with admin+ role
  if (!isPlatform) {
    const { data: membership } = await admin
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("tenant_id", page.tenant_id)
      .single();

    if (!membership) notFound();

    const roleLevel: Record<string, number> = { editor: 0, admin: 1, owner: 2 };
    if ((roleLevel[membership.role] ?? -1) < 1) {
      redirect("/admin/pages");
    }
  }

  // Build Puck initial data from DB sections+blocks
  const sections = ((page as Record<string, unknown>).sections as Array<Record<string, unknown>>) || [];
  const typedSections = sections.map((s) => ({
    id: s.id as number,
    page_id: s.page_id as number,
    type: (s.type as string) || "default",
    position: (s.position as number) || 0,
    blocks: ((s.blocks as Array<Record<string, unknown>>) || []).map((b) => ({
      id: b.id as number,
      section_id: b.section_id as number,
      type: b.type as string,
      content: (b.content as Record<string, unknown>) || {},
      position: (b.position as number) || 0,
    })),
  }));

  const initialData = dbToPuck(typedSections);

  // Fetch media associations so the Puck editor preview can render PageMediaBlock
  const pageMedia = await getPageMedia(pageId);

  // Fetch tenant theme so the Puck editor canvas previews blocks with the
  // tenant's selected palette (matches the public site at runtime). The
  // admin chrome around the canvas keeps the user's admin theme intact.
  const tenantTheme = await getSettings(page.tenant_id, "theme");
  const tenantThemeVars = paletteToCssVars(tenantTheme?.palette ?? null);
  const tenantThemeMode = tenantTheme?.mode === "dark" ? "dark" : "light";

  const tenantDomain = ((page as Record<string, unknown>).tenants as { domain: string } | null)?.domain ?? "";
  const isHomepage = (page as unknown as { is_homepage?: boolean }).is_homepage;
  const pageSlug = isHomepage ? "/" : `/${page.slug}`;
  const pageType = (page as unknown as { page_type?: string }).page_type ?? "custom";
  const isHeader = pageType === "site_header";

  return (
    <PuckEditor
      pageId={pageId}
      pageTitle={page.title}
      initialData={initialData}
      tenantId={page.tenant_id}
      tenantDomain={tenantDomain}
      pageSlug={pageSlug}
      pageMedia={pageMedia}
      variant={isHeader ? "site_header" : "page"}
      hideViewPage={isHeader}
      tenantThemeVars={tenantThemeVars}
      tenantThemeMode={tenantThemeMode}
    />
  );
}
