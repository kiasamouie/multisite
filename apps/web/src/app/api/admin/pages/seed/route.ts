import { cookies } from "next/headers";
import { createServerClient } from "@repo/lib/supabase/server";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { getPlatformAdmin } from "@repo/lib/tenant/platform";
import { resolveTenantsByUserId } from "@repo/lib/tenant/resolver";
import { revalidateTag } from "next/cache";
import type { Json } from "@repo/lib/supabase/types";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/pages/seed
 *
 * Atomically creates a page with its sections and blocks from a JSON payload.
 * This is the target endpoint for the Stitch → DB pipeline:
 *   Stitch screen → block mapping → seed payload → this route → DB records.
 *
 * Request body:
 * {
 *   tenantId: number,
 *   slug: string,
 *   title: string,
 *   is_published?: boolean,
 *   is_homepage?: boolean,
 *   page_type?: "custom" | "template",
 *   feature_key?: string | null,
 *   page_config?: Record<string, unknown>,
 *   sections: Array<{
 *     type?: string,
 *     position: number,
 *     blocks: Array<{
 *       type: string,
 *       content: Record<string, unknown>,
 *       position: number
 *     }>
 *   }>
 * }
 *
 * Response: { pageId, sectionsCreated, blocksCreated }
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      tenantId,
      slug,
      title,
      is_published = false,
      is_homepage = false,
      page_type = "custom",
      feature_key = null,
      page_config = {},
      sections = [],
    } = body as {
      tenantId: number;
      slug: string;
      title: string;
      is_published?: boolean;
      is_homepage?: boolean;
      page_type?: string;
      feature_key?: string | null;
      page_config?: Record<string, unknown>;
      sections: Array<{
        type?: string;
        position: number;
        blocks: Array<{
          type: string;
          content: Record<string, unknown>;
          position: number;
        }>;
      }>;
    };

    // Validate required fields
    if (!tenantId || !slug || !title) {
      return NextResponse.json(
        { message: "Missing required fields: tenantId, slug, title" },
        { status: 400 }
      );
    }

    // Validate slug format
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
      return NextResponse.json(
        { message: "Invalid slug format. Use lowercase alphanumeric and hyphens." },
        { status: 400 }
      );
    }

    // Authorization: platform admin or tenant member
    const platformAdmin = await getPlatformAdmin(user.id);
    if (!platformAdmin) {
      const tenants = await resolveTenantsByUserId(user.id);
      const hasTenant = tenants?.some((t) => t.id === tenantId);
      if (!hasTenant) {
        return NextResponse.json(
          { message: "Not authorized for this tenant" },
          { status: 403 }
        );
      }
    }

    const adminSupabase = createAdminClient();

    // 1. Create the page
    // Note: page_type, feature_key, page_config exist in DB (migration 0019)
    // but are not yet in the generated Supabase types — hence the cast.
    const { data: page, error: pageError } = await adminSupabase
      .from("pages")
      .insert({
        tenant_id: tenantId,
        slug,
        title,
        is_published,
        is_homepage,
        page_type,
        feature_key,
        page_config: page_config as unknown as Json,
      } as any)
      .select("id")
      .single();

    if (pageError || !page) {
      // Handle duplicate slug
      if (pageError?.code === "23505") {
        return NextResponse.json(
          { message: `Page with slug "${slug}" already exists for this tenant` },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { message: pageError?.message || "Failed to create page" },
        { status: 500 }
      );
    }

    let sectionsCreated = 0;
    let blocksCreated = 0;

    // 2. Create sections + blocks
    for (const sectionDef of sections) {
      const { data: section, error: sectionError } = await adminSupabase
        .from("sections")
        .insert({
          page_id: page.id,
          type: sectionDef.type || "default",
          position: sectionDef.position,
        })
        .select("id")
        .single();

      if (sectionError || !section) {
        console.error("Failed to create section:", sectionError);
        continue;
      }
      sectionsCreated++;

      if (sectionDef.blocks.length > 0) {
        const blockRows = sectionDef.blocks.map((b) => ({
          section_id: section.id,
          type: b.type,
          content: b.content as unknown as Json,
          position: b.position,
        }));

        const { error: blockError, data: insertedBlocks } = await adminSupabase
          .from("blocks")
          .insert(blockRows)
          .select("id");

        if (blockError) {
          console.error("Failed to create blocks:", blockError);
        } else {
          blocksCreated += insertedBlocks?.length || 0;
        }
      }
    }

    revalidateTag("pages");

    return NextResponse.json({
      pageId: page.id,
      slug,
      sectionsCreated,
      blocksCreated,
    });
  } catch (error) {
    console.error("Seed page error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
