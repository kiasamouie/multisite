import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@repo/lib/supabase/server";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { isPlatformAdmin } from "@repo/lib/tenant/platform";
import { resolveTenantsByUserId } from "@repo/lib/tenant/resolver";
import { getPageMedia } from "@repo/lib/media/resolve";
import { dbToPuck } from "@/lib/puck/adapter";
import { PuckEditor } from "../pages/[id]/edit/editor";

/**
 * /admin/header-footer
 *
 * Single destination to manage the site-wide navbar/header AND footer in
 * the Puck editor. The header & footer are NOT regular pages — they live
 * in a hidden `site_header` page record (one per tenant) and never appear
 * in the public site or the Pages list.
 *
 * Renders the Puck editor inline at this URL (no redirect to /admin/pages/N/edit)
 * so the URL stays generic across all tenants.
 */
export default async function HeaderFooterPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const admin = createAdminClient();
  const isPlatform = await isPlatformAdmin(user.id);

  // Resolve which tenant we're editing.
  const headerStore = await headers();
  const host = (headerStore.get("host") || "").toLowerCase().replace(/:\d+$/, "");
  const adminDomain =
    process.env.NEXT_PUBLIC_ADMIN_DOMAIN?.replace(/:\d+$/, "") || "admin.localhost";
  const isPlatformHost =
    host === adminDomain || host === "localhost" || host.startsWith("admin.");

  let tenantId: number | null = null;

  if (!isPlatformHost) {
    const { data: tenantRow } = await admin
      .from("tenants")
      .select("id")
      .eq("domain", host)
      .maybeSingle();
    tenantId = (tenantRow as { id: number } | null)?.id ?? null;
  }

  if (!tenantId && !isPlatform) {
    const tenants = await resolveTenantsByUserId(user.id);
    tenantId = tenants?.[0]?.id ?? null;
  }

  if (!tenantId) {
    redirect("/admin/tenants");
  }

  // Find or create the hidden site_header page record for this tenant.
  const { data: existing } = await admin
    .from("pages")
    .select("id, title")
    .eq("tenant_id", tenantId)
    .eq("page_type", "site_header")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  let headerPageId = (existing as { id: number; title?: string } | null)?.id ?? null;

  if (!headerPageId) {
    const { data: created, error: createErr } = await admin
      .from("pages")
      .insert({
        tenant_id: tenantId,
        slug: "__site_header__",
        title: "Header & Footer",
        page_type: "site_header",
        is_published: false,
        is_homepage: false,
      })
      .select("id")
      .single();

    if (createErr || !created) {
      throw new Error(`Failed to initialise site header: ${createErr?.message ?? "unknown"}`);
    }
    headerPageId = (created as { id: number }).id;
  } else if ((existing as { title?: string } | null)?.title !== "Header & Footer") {
    await admin
      .from("pages")
      .update({ title: "Header & Footer" })
      .eq("id", headerPageId);
  }

  // Ensure the page has BOTH a site_header and a site_footer block.
  const { data: sections } = await admin
    .from("sections")
    .select("id, position, blocks(id, type)")
    .eq("page_id", headerPageId)
    .order("position", { ascending: true });

  type SectionRow = {
    id: number;
    position: number;
    blocks?: Array<{ id: number; type: string }> | null;
  };
  const sectionRows = (sections ?? []) as SectionRow[];
  const allBlocks = sectionRows.flatMap((s) => s.blocks ?? []);
  const hasHeaderBlock = allBlocks.some((b) => b.type === "site_header");
  const hasFooterBlock = allBlocks.some((b) => b.type === "site_footer");

  const ensureSection = async (position: number): Promise<number> => {
    const existingSection = sectionRows.find((s) => s.position === position);
    if (existingSection) return existingSection.id;
    const { data: created, error } = await admin
      .from("sections")
      .insert({ page_id: headerPageId, type: "default", position })
      .select("id")
      .single();
    if (error || !created) {
      throw new Error(`Failed to create section: ${error?.message ?? "unknown"}`);
    }
    return (created as { id: number }).id;
  };

  if (!hasHeaderBlock) {
    const sectionId = await ensureSection(0);
    await admin.from("blocks").insert({
      section_id: sectionId,
      type: "site_header",
      position: 0,
      content: {
        leftItems: [
          { kind: "text", text: "Your Brand", imageId: null, href: "/", variant: "default" },
        ],
        navPages: [],
        rightItems: [
          { kind: "button", text: "Book Now", imageId: null, href: "/booking", variant: "default" },
        ],
        sticky: "true",
        borderBottom: "true",
      },
    });
  }

  if (!hasFooterBlock) {
    const sectionId = await ensureSection(1);
    await admin.from("blocks").insert({
      section_id: sectionId,
      type: "site_footer",
      position: 0,
      content: {
        leftItems: [
          { kind: "text", text: "© Your Company", imageId: null, href: "", variant: "default" },
        ],
        centerItems: [],
        rightItems: [],
        borderTop: "true",
      },
    });
  }

  // Now load the page (with sections + blocks + tenant domain) so we can
  // render the Puck editor inline at this URL.
  const { data: page } = await admin
    .from("pages")
    .select("id, title, slug, is_homepage, tenant_id, page_type, sections(*, blocks(*)), tenants(domain)")
    .eq("id", headerPageId)
    .single();

  if (!page) {
    throw new Error("Failed to load Header & Footer page after creation.");
  }

  const sectionData = ((page as Record<string, unknown>).sections as Array<Record<string, unknown>>) || [];
  const typedSections = sectionData.map((s) => ({
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
  const pageMedia = await getPageMedia(headerPageId);
  const tenantDomain = ((page as Record<string, unknown>).tenants as { domain: string } | null)?.domain ?? "";

  return (
    <PuckEditor
      pageId={headerPageId}
      pageTitle="Header & Footer"
      initialData={initialData}
      tenantId={page.tenant_id}
      tenantDomain={tenantDomain}
      pageSlug="/"
      pageMedia={pageMedia}
      variant="site_header"
      hideViewPage
    />
  );
}
