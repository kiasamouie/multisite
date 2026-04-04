import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@repo/lib/supabase/server";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { isPlatformAdmin } from "@repo/lib/tenant/platform";

export type AuthResult =
  | { ok: true; userId: string; admin: ReturnType<typeof createAdminClient>; isPlatform: boolean }
  | { ok: false; response: NextResponse };

/**
 * Authenticate the current request and return admin client + user info.
 * Returns 401 if not authenticated.
 */
export async function authenticateRequest(): Promise<AuthResult> {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const isPlatform = await isPlatformAdmin(user.id);

  return { ok: true, userId: user.id, admin, isPlatform };
}

/**
 * Check that the user is a member of the tenant (owner, admin, or editor).
 * Platform admins bypass this check.
 */
export async function requireTenantMembership(
  userId: string,
  tenantId: number,
  admin: ReturnType<typeof createAdminClient>,
  isPlatform: boolean,
  minRole: "editor" | "admin" | "owner" = "editor"
): Promise<{ allowed: boolean; role: string | null; response?: NextResponse }> {
  if (isPlatform) return { allowed: true, role: "platform_admin" };

  const { data: membership } = await admin
    .from("memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .single();

  if (!membership) {
    return { allowed: false, role: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const roleHierarchy = { editor: 0, admin: 1, owner: 2 };
  const userLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] ?? -1;
  const requiredLevel = roleHierarchy[minRole];

  if (userLevel < requiredLevel) {
    return { allowed: false, role: membership.role, response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }

  return { allowed: true, role: membership.role };
}
