"use client";

import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router";
import { dataProvider as supabaseDataProvider, liveProvider } from "@refinedev/supabase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserClient } from "@repo/lib/supabase/browser";

// Supabase client for Refine (anon key + RLS)
const supabaseClient = createBrowserClient();

const dataProvider = supabaseDataProvider(supabaseClient);

// Create a client for TanStack Query (required by Refine)
const queryClient = new QueryClient();

/**
 * Wraps admin area with Refine context.
 * Resources are defined here so any page can use useTable/useForm/useOne/useDelete hooks.
 * Data goes through RLS — super admin actions use /api/admin/* REST routes instead.
 */
export function RefineProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Refine
        dataProvider={dataProvider}
        liveProvider={liveProvider(supabaseClient)}
        routerProvider={routerProvider}
        resources={[
          { name: "tenants", list: "/admin/tenants", create: "/admin/tenants/create", edit: "/admin/tenants/:id/edit", show: "/admin/tenants/:id", meta: { idColumnName: "id" } },
          { name: "pages", list: "/admin/pages", create: "/admin/pages", edit: "/admin/pages/:id/editor", meta: { idColumnName: "id" } },
          { name: "events", list: "/admin/analytics", meta: { idColumnName: "id" } },
          { name: "subscriptions", list: "/admin/billing", meta: { idColumnName: "id" } },
          { name: "audit_logs", list: "/admin/logs", meta: { idColumnName: "id" } },
          { name: "media", list: "/admin/media", meta: { idColumnName: "id" } },
        ]}
        options={{ syncWithLocation: true, warnWhenUnsavedChanges: false, disableTelemetry: true }}
      >
        {children}
      </Refine>
    </QueryClientProvider>
  );
}
