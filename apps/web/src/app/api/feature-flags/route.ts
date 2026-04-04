import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireTenantMembership } from "@/lib/api-auth";
import { featureFlagSchema } from "@repo/lib/validation/schemas";

// GET /api/feature-flags?tenantId=X — get all flags for a tenant (merged with defaults)
export async function GET(request: NextRequest) {
  const tenantId = Number(request.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const access = await requireTenantMembership(auth.userId, tenantId, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  // Get tenant plan
  const { data: tenant } = await auth.admin.from("tenants").select("plan").eq("id", tenantId).single();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  // Get plan defaults
  const { data: defaults } = await auth.admin
    .from("feature_flag_defaults")
    .select("key, default_enabled")
    .eq("plan_tier", tenant.plan);

  // Get per-tenant overrides
  const { data: overrides } = await auth.admin
    .from("feature_flags")
    .select("id, key, enabled")
    .eq("tenant_id", tenantId);

  // Build merged flag map
  const overrideMap = new Map((overrides || []).map((o) => [o.key, o]));
  const flags = (defaults || []).map((d) => {
    const override = overrideMap.get(d.key);
    return {
      key: d.key,
      enabled: override ? override.enabled : d.default_enabled,
      isOverridden: !!override,
      overrideId: override?.id ?? null,
    };
  });

  // Add any overrides that don't have a default
  for (const [key, override] of overrideMap) {
    if (!flags.find((f) => f.key === key)) {
      flags.push({ key, enabled: override.enabled, isOverridden: true, overrideId: override.id });
    }
  }

  return NextResponse.json({ plan: tenant.plan, flags });
}

// PUT /api/feature-flags — upsert a per-tenant feature flag override
export async function PUT(request: NextRequest) {
  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = featureFlagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { tenant_id, key, enabled } = parsed.data;

  // Only platform admins can toggle flags for any tenant
  // Tenant admins can only manage their own flags
  const access = await requireTenantMembership(auth.userId, tenant_id, auth.admin, auth.isPlatform, "admin");
  if (!access.allowed) return access.response!;

  const { data, error } = await auth.admin
    .from("feature_flags")
    .upsert({ tenant_id, key, enabled }, { onConflict: "tenant_id,key" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
