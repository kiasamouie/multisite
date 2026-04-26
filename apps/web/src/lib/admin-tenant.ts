import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@repo/lib/supabase/server";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { isPlatformAdmin } from "@repo/lib/tenant/platform";
import { resolveTenantsByUserId } from "@repo/lib/tenant/resolver";

/**
 * Resolve which tenant the current admin request is editing.
 *
 * Priority:
 *   1. Tenant subdomain (e.g. `kaimusic.localhost`) → that tenant
 *   2. Authenticated user's first membership                 → tenant admin
 *   3. Fallback redirect to `/admin/tenants` for platform admins on the
 *      platform host with no subdomain selected
 *
 * Throws-via-redirect when no tenant can be determined.
 */
export async function getActiveAdminTenantId(): Promise<{
  tenantId: number;
  isPlatform: boolean;
  userId: string;
}> {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const isPlatform = await isPlatformAdmin(user.id);

  const headerStore = await headers();
  const host = (headerStore.get("host") || "")
    .toLowerCase()
    .replace(/:\d+$/, "");
  const adminDomain =
    process.env.NEXT_PUBLIC_ADMIN_DOMAIN?.replace(/:\d+$/, "") ||
    "admin.localhost";
  const isPlatformHost =
    host === adminDomain ||
    host === "localhost" ||
    host.startsWith("admin.");

  let tenantId: number | null = null;

  if (!isPlatformHost) {
    const admin = createAdminClient();
    const { data: tenantRow } = await admin
      .from("tenants")
      .select("id")
      .eq("domain", host)
      .maybeSingle();
    tenantId = (tenantRow as { id: number } | null)?.id ?? null;
  }

  if (!tenantId && !isPlatform) {
    const tenants = await resolveTenantsByUserId(user.id);
    tenantId = tenants?.[0]?.id ?? null;
  }

  if (!tenantId) {
    redirect("/admin/tenants");
  }

  return { tenantId, isPlatform, userId: user.id };
}
