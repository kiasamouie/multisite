import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createServerClient } from "@repo/lib/supabase/server";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { isPlatformAdmin } from "@repo/lib/tenant/platform";
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

  // Fetch the page with sections + blocks
  const { data: page, error } = await admin
    .from("pages")
    .select("id, title, slug, tenant_id, sections(*, blocks(*))")
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

  return (
    <PuckEditor
      pageId={pageId}
      pageTitle={page.title}
      initialData={initialData}
    />
  );
}
