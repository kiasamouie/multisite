import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireTenantMembership } from "@/lib/api-auth";
import { pageSchema } from "@repo/lib/validation/schemas";
import { headers } from "next/headers";
import { createAdminClient } from "@repo/lib/supabase/admin";

// GET /api/pages?tenantId=X — list pages for a tenant
export async function GET(request: NextRequest) {
  const tenantId = Number(request.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
  }

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const access = await requireTenantMembership(auth.userId, tenantId, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  const { data, error } = await auth.admin
    .from("pages")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/pages — create a page
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = pageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { tenant_id, slug, title, is_published, is_homepage } = parsed.data;

  const access = await requireTenantMembership(auth.userId, tenant_id, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  // If setting as homepage, unset any existing homepage
  if (is_homepage) {
    await auth.admin
      .from("pages")
      .update({ is_homepage: false })
      .eq("tenant_id", tenant_id)
      .eq("is_homepage", true);
  }

  const { data, error } = await auth.admin
    .from("pages")
    .insert({ tenant_id, slug, title, is_published, is_homepage: is_homepage ?? false })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Slug already exists for this tenant" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
