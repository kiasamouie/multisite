import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { getStripe } from "@repo/lib/stripe/client";
import { cookies } from "next/headers";
import { createServerClient } from "@repo/lib/supabase/server";
import { getPriceId } from "@repo/lib/stripe/plans";

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
    const { tenantId, plan } = body;

    if (!tenantId || !plan) {
      return NextResponse.json({ error: "Missing tenantId or plan" }, { status: 400 });
    }

    const numericTenantId = typeof tenantId === "string" ? parseInt(tenantId, 10) : tenantId;
    if (isNaN(numericTenantId)) {
      return NextResponse.json({ error: "Invalid tenantId" }, { status: 400 });
    }

    // Verify membership
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

    // Get tenant
    const { data: tenant } = await admin
      .from("tenants")
      .select("stripe_customer_id")
      .eq("id", numericTenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const stripe = getStripe();
    const priceId = getPriceId(plan);
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      customer: tenant.stripe_customer_id || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_PLATFORM_URL}/admin/subscriptions?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_PLATFORM_URL}/admin/subscriptions?canceled=true`,
      metadata: { tenant_id: String(numericTenantId) },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/checkout] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
