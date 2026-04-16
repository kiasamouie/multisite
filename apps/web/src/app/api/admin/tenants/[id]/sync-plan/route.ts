import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { syncTenantPlan } from "@repo/lib/tenant/provisioning";
import type { PlanTier } from "@repo/lib/stripe/plans";
import { PLANS } from "@repo/lib/stripe/plans";

/**
 * POST /api/admin/tenants/[id]/sync-plan
 *
 * Re-syncs a tenant's feature flags and template pages to match their
 * current (or explicitly supplied) plan. Safe to call multiple times —
 * existing pages and flags are upserted, not duplicated.
 *
 * Body (optional): { plan: "starter" | "growth" | "pro" }
 * If omitted, reads the tenant's current plan from the DB.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  if (!auth.isPlatform) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const tenantId = parseInt(id, 10);
  if (isNaN(tenantId)) {
    return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  // Optional explicit plan override in the request body
  let plan: PlanTier | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.plan && Object.keys(PLANS).includes(body.plan)) {
      plan = body.plan as PlanTier;
    }
  } catch {
    // body is optional
  }

  if (!plan) {
    // Read the tenant's current plan from DB
    const { data: tenant, error } = await auth.admin
      .from("tenants")
      .select("plan")
      .eq("id", tenantId)
      .single();

    if (error || !tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    if (!Object.keys(PLANS).includes(tenant.plan)) {
      return NextResponse.json({ error: `Unknown plan: ${tenant.plan}` }, { status: 400 });
    }

    plan = tenant.plan as PlanTier;
  }

  const result = await syncTenantPlan(tenantId, plan);

  return NextResponse.json(result, { status: result.success ? 200 : 207 });
}
