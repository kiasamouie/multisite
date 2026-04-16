"use client";

import { createContext, useContext } from "react";

interface AdminContextValue {
  tenantId: number | null;
  plan: string | null;
}

export const AdminContext = createContext<AdminContextValue>({
  tenantId: null,
  plan: null,
});

export function useAdmin(): AdminContextValue {
  return useContext(AdminContext);
}
