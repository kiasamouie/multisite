/**
 * Feature Flags API
 * 
 * Endpoints for managing feature flags per tenant
 * POST /api/admin/feature-flags/toggle - Toggle a feature flag
 * GET /api/admin/feature-flags?tenant_id=X - Get all flags for a tenant
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@repo/lib/supabase/server";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { isPlatformAdmin } from "@repo/lib/tenant/platform";
import { toggleFeatureFlag, getFeatureFlags } from "@repo/lib/tenant/featureFlags";
import { z } from "zod";

const toggleFlagSchema = z.object({
  tenant_id: z.number().int().positive(),
  feature_key: z.string().min(1),
  enabled: z.boolean(),
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
    return NextResponse.json({ error: "Forbidden: only platform admins can toggle feature flags" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = toggleFlagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { tenant_id, feature_key, enabled } = parsed.data;

  const result = await toggleFeatureFlag(tenant_id, feature_key, enabled);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      flag_updated: result.flagUpdated,
      pages_affected: result.pagesAffected,
      message: `Feature "${feature_key}" is now ${enabled ? "enabled" : "disabled"}`,
    },
    { status: 200 }
  );
}

export async function GET(request: NextRequest) {
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

  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant_id parameter" }, { status: 400 });
  }

  try {
    const flags = await getFeatureFlags(Number(tenantId));
    return NextResponse.json({ flags }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch flags" },
      { status: 500 }
    );
  }
}
