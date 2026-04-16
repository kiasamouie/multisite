"use client";

import { QueryProvider } from "./_providers/query";
import { AdminContext } from "@/context/admin-context";

interface AdminClientWrapperProps {
  children: React.ReactNode;
  /** Tenant in scope for this admin session. null = platform-wide view. */
  tenantId?: number | null;
  /** Tenant plan tier. null for platform-wide view. */
  plan?: string | null;
}

export function AdminClientWrapper({ children, tenantId = null, plan = null }: AdminClientWrapperProps) {
  return (
    <AdminContext.Provider value={{ tenantId, plan }}>
      <QueryProvider>
        {children}
      </QueryProvider>
    </AdminContext.Provider>
  );
}
