"use client";

import { createContext, useContext } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantAdminContextValue {
  /**
   * The tenant currently in scope for this admin session.
   * - `null`  → platform-wide view (super/platform admin on localhost/admin domain)
   * - `number` → scoped to this specific tenant (tenant admin OR platform admin
   *              viewing a tenant subdomain)
   */
  tenantId: number | null;
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const TenantAdminContext = createContext<TenantAdminContextValue>({
  tenantId: null,
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTenantAdmin(): TenantAdminContextValue {
  return useContext(TenantAdminContext);
}
