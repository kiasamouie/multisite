import { createAdminClient } from "../supabase/admin";
import type { Tenant } from "./context";

/**
 * Resolve tenant by domain. Used in middleware for public sites.
 * Uses service role to bypass RLS (middleware has no user session).
 */
export async function resolveTenantByDomain(domain: string): Promise<Tenant | null> {
  const supabase = createAdminClient();
  const normalizedDomain = domain.toLowerCase().replace(/:\d+$/, "");

  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("domain", normalizedDomain)
    .single();

  if (error || !data) return null;
  return data as Tenant;
}

/**
 * Resolve tenants for a user. Used in admin panel to determine
 * which tenants the user has access to.
 */
export async function resolveTenantsByUserId(
  userId: string
): Promise<Array<Tenant & { role: "owner" | "admin" | "editor" }>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("role, tenants(*)")
    .eq("user_id", userId);

  if (error || !data) return [];

  return data
    .filter((m) => m.tenants)
    .map((m) => ({
      ...(m.tenants as unknown as Tenant),
      role: m.role as "owner" | "admin" | "editor",
    }));
}

/**
 * Resolve a single tenant for a user by tenant_id.
 * Validates that the user actually has membership.
 */
export async function resolveTenantForUser(
  userId: string,
  tenantId: number
): Promise<(Tenant & { role: "owner" | "admin" | "editor" }) | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("role, tenants(*)")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data || !data.tenants) return null;

  return {
    ...(data.tenants as unknown as Tenant),
    role: data.role as "owner" | "admin" | "editor",
  };
}
