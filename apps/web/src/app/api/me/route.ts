import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@repo/lib/supabase/server";
import { resolveTenantsByUserId } from "@repo/lib/tenant/resolver";

// GET /api/me — returns current user info + primary tenant
export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenants = await resolveTenantsByUserId(user.id);
  const primary = tenants[0] ?? null;

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    tenantId: primary?.id ?? null,
    tenantName: primary?.name ?? null,
    role: primary?.role ?? null,
    tenants: tenants.map((t) => ({ id: t.id, name: t.name, domain: t.domain, role: t.role })),
  });
}
