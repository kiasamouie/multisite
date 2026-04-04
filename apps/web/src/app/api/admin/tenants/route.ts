import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@repo/lib/supabase/server";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { isPlatformAdmin } from "@repo/lib/tenant/platform";
import { provisionTenant } from "@repo/lib/tenant/provisioning";
import { tenantUpdateSchema } from "@repo/lib/validation/schemas";
import { normalizeDomain } from "@repo/lib/domain";
import { z } from "zod";

const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().min(1).max(255).regex(/^[a-z0-9.-]+$/, "Domain must be lowercase alphanumeric with dots and hyphens"),
  plan: z.enum(["starter", "growth", "pro"]).default("starter"),
  adminEmail: z.string().email().optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await isPlatformAdmin(user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { name, plan, adminEmail } = parsed.data;
  let { domain } = parsed.data;
  
  // Normalize domain based on environment (localhost on dev, real domain on prod)
  domain = normalizeDomain(domain);
  
  const admin = createAdminClient();

  const { data: existing } = await admin.from("tenants").select("id").eq("domain", domain).single();
  if (existing) {
    return NextResponse.json({ error: "Domain already in use" }, { status: 409 });
  }

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({ name, domain, plan })
    .select("id")
    .single();

  if (tenantError || !tenant) {
    return NextResponse.json({ error: tenantError?.message ?? "Failed to create tenant" }, { status: 500 });
  }

  if (adminEmail) {
    const { data: { users } } = await admin.auth.admin.listUsers();
    const adminUser = users.find((u) => u.email === adminEmail);
    if (adminUser) {
      await admin.from("memberships").insert({
        tenant_id: tenant.id,
        user_id: adminUser.id,
        role: "admin",
      });
    }
  }

  // Provision default pages and feature flags for the new tenant
  const provisioningResult = await provisionTenant(tenant.id, plan as "starter" | "growth" | "pro");
  
  if (!provisioningResult.success) {
    console.error(`Provisioning warnings for tenant ${tenant.id}:`, provisioningResult.errors);
  }

  return NextResponse.json(
    { 
      id: tenant.id,
      provisioning: {
        pagesCreated: provisioningResult.pagesCreated,
        flagsCreated: provisioningResult.flagsCreated,
        errors: provisioningResult.errors,
      },
    }, 
    { status: 201 }
  );
}

// --- Platform-admin gate helper ---
async function requirePlatformAuth() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const allowed = await isPlatformAdmin(user.id);
  if (!allowed) return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { ok: true as const, userId: user.id, admin: createAdminClient() };
}

// GET /api/admin/tenants — list all tenants (paginated)
export async function GET(request: NextRequest) {
  const auth = await requirePlatformAuth();
  if (!auth.ok) return auth.response;

  const url = request.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage")) || 20));
  const search = url.searchParams.get("search") || "";

  let query = auth.admin
    .from("tenants")
    .select("*, subscriptions(stripe_subscription_id, status)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,domain.ilike.%${search}%`);
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tenants: data, total: count, page, perPage });
}

// PUT /api/admin/tenants?id=X — update a tenant
export async function PUT(request: NextRequest) {
  const auth = await requirePlatformAuth();
  if (!auth.ok) return auth.response;

  const tenantId = Number(request.nextUrl.searchParams.get("id"));
  if (!tenantId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = tenantUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { data, error } = await auth.admin
    .from("tenants")
    .update(parsed.data)
    .eq("id", tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/admin/tenants?id=X — delete a tenant and cascade
export async function DELETE(request: NextRequest) {
  const auth = await requirePlatformAuth();
  if (!auth.ok) return auth.response;

  const tenantId = Number(request.nextUrl.searchParams.get("id"));
  if (!tenantId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // cascading deletes handled by FK ON DELETE CASCADE in migrations
  const { error } = await auth.admin.from("tenants").delete().eq("id", tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
