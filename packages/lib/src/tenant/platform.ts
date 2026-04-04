import { createAdminClient } from "../supabase/admin";

export type PlatformAdminRole = "super_admin" | "platform_admin";

export interface PlatformAdmin {
  id: number;
  userId: string;
  role: PlatformAdminRole;
}

/**
 * Returns the platform admin record for a user, or null if not a platform admin.
 * Uses the service-role client — bypasses RLS entirely.
 */
export async function getPlatformAdmin(userId: string): Promise<PlatformAdmin | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("platform_admins")
    .select("id, user_id, role")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    role: data.role as PlatformAdminRole,
  };
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const admin = await getPlatformAdmin(userId);
  return admin !== null;
}
