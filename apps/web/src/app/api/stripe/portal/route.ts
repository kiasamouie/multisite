import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { getStripe } from "@repo/lib/stripe/client";
import { cookies } from "next/headers";
import { createServerClient } from "@repo/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
    }

    const numericTenantId = typeof tenantId === "string" ? parseInt(tenantId, 10) : tenantId;
    if (isNaN(numericTenantId)) {
      return NextResponse.json({ error: "Invalid tenantId" }, { status: 400 });
    }

    // Verify the user has admin/owner membership for this tenant
    const admin = createAdminClient();
    const { data: membership } = await admin
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("tenant_id", numericTenantId)
      .single();

    if (!membership || membership.role === "editor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: tenant } = await admin
      .from("tenants")
      .select("stripe_customer_id")
      .eq("id", numericTenantId)
      .single();

    if (!tenant?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account" }, { status: 404 });
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_PLATFORM_URL}/admin/subscriptions`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/portal] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
