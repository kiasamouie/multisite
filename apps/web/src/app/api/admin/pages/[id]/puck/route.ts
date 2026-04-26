import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { authenticateRequest, requireTenantMembership } from "@/lib/api-auth";
import { puckToDb, type PuckData } from "@/lib/puck/adapter";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pageId = parseInt(id, 10);
  if (isNaN(pageId)) {
    return NextResponse.json({ error: "Invalid page ID" }, { status: 400 });
  }

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  // Verify the page exists and get the tenant
  const { data: page, error: pageError } = await auth.admin
    .from("pages")
    .select("id, tenant_id")
    .eq("id", pageId)
    .single();

  if (pageError || !page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  // Require admin-level access to the tenant
  const access = await requireTenantMembership(
    auth.userId,
    page.tenant_id,
    auth.admin,
    auth.isPlatform,
    "admin"
  );
  if (!access.allowed) return access.response!;

  // Parse and validate the Puck data
  let puckData: PuckData;
  try {
    const body = await request.json();
    puckData = body.data;
    if (!puckData?.content || !Array.isArray(puckData.content)) {
      return NextResponse.json({ error: "Invalid Puck data format" }, { status: 400 });
    }

    // Strip the editor-only `page_content_placeholder` block before
    // persisting. It exists solely as a visual spacer in the
    // Header & Footer Puck preview and must never reach the DB.
    puckData = {
      ...puckData,
      content: puckData.content.filter(
        (b) =>
          !(
            b &&
            typeof b === "object" &&
            (b as { type?: string }).type === "page_content_placeholder"
          ),
      ),
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Convert Puck data to DB format
  const dbSections = puckToDb(puckData);

  // Delete existing sections (blocks cascade-delete via FK)
  const { error: deleteError } = await auth.admin
    .from("sections")
    .delete()
    .eq("page_id", pageId);

  if (deleteError) {
    return NextResponse.json(
      { error: `Failed to clear existing sections: ${deleteError.message}` },
      { status: 500 }
    );
  }

  // Insert new sections and blocks
  for (const section of dbSections) {
    const { data: sectionData, error: sectionError } = await auth.admin
      .from("sections")
      .insert({
        page_id: pageId,
        type: section.type,
        position: section.position,
      })
      .select("id")
      .single();

    if (sectionError) {
      return NextResponse.json(
        { error: `Failed to create section: ${sectionError.message}` },
        { status: 500 }
      );
    }

    if (section.blocks.length > 0) {
      const blockInserts = section.blocks.map((b) => ({
        section_id: sectionData.id,
        type: b.type,
        content: b.content as unknown as Record<string, never>,
        position: b.position,
      }));

      const { error: blockError } = await auth.admin
        .from("blocks")
        .insert(blockInserts);

      if (blockError) {
        return NextResponse.json(
          { error: `Failed to create blocks: ${blockError.message}` },
          { status: 500 }
        );
      }
    }
  }

  // Invalidate page cache so the tenant site shows fresh content
  revalidateTag("pages", "max");

  return NextResponse.json({ success: true });
}
