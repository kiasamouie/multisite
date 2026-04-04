import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { PLANS } from "@repo/lib/stripe/plans";

/**
 * GET /api/admin/plans
 *
 * Returns available plan options for form selects.
 * Derives from the PLANS constant in @repo/lib/stripe/plans.ts
 */
export async function GET() {
  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  // Only platform admins can access plans
  if (!auth.isPlatform) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const options = Object.values(PLANS).map((plan) => ({
    value: plan.tier,
    label: plan.name,
  }));

  return NextResponse.json({ plans: options });
}
