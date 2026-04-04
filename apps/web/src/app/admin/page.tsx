"use client";

import { DashboardLayout } from "@/components/admin/dashboard";
import { useTenantAdmin } from "@/components/admin";

export default function AdminDashboard() {
  const { tenantId } = useTenantAdmin();

  return (
    <div className="flex flex-1 flex-col gap-6 py-2">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          {tenantId === null ? "Platform overview" : "Your site overview"}
        </p>
      </div>
      <DashboardLayout tenantIdOverride={tenantId ?? undefined} />
    </div>
  );
}
