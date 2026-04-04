"use client";

import { RefineProvider } from "./_providers/refine";
import { TenantAdminContext } from "@/components/admin";

interface AdminClientWrapperProps {
  children: React.ReactNode;
  /** Tenant in scope for this admin session. null = platform-wide view. */
  tenantId?: number | null;
}

export function AdminClientWrapper({ children, tenantId = null }: AdminClientWrapperProps) {
  return (
    <TenantAdminContext.Provider value={{ tenantId }}>
      <RefineProvider>{children}</RefineProvider>
    </TenantAdminContext.Provider>
  );
}
