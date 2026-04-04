"use client";

import { PageHeader } from "@repo/ui/admin/page-header";
import { DashboardLayout } from "@/components/admin/dashboard";
import { useTenantAdmin } from "@/components/admin";

export default function AdminDashboard() {
  const { tenantId } = useTenantAdmin();

  return (
    <main className="min-h-screen px-8 pb-12 pt-8">
      <PageHeader
        title="Dashboard"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Dashboard" },
        ]}
      />
      <DashboardLayout tenantIdOverride={tenantId ?? undefined} />
    </main>
  );
}
