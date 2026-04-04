import { createAdminClient } from "../supabase/admin";
import type { Json } from "../supabase/types";

export async function trackEvent(
  tenantId: number,
  eventType: string,
  data: Record<string, Json | undefined>,
  userId?: string
) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("events").insert({
    tenant_id: tenantId,
    event_type: eventType,
    user_id: userId || null,
    data,
  });

  if (error) {
    console.error("[events] Failed to track event:", error.message);
  }
}
