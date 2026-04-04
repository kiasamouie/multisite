"use client";

import { useTenantAdmin, Resource, DateCell } from "@/components/admin";

interface PageRecord extends Record<string, unknown> {
  id: number;
  tenant_id: number;
  slug: string;
  title: string;
  is_published: boolean;
  is_homepage: boolean;
  created_at: string;
  updated_at: string;
  tenants?: {
    id: number;
    name: string;
    domain: string;
  };
}

function PageDetailsPanel({ page }: { page: PageRecord }) {
  const { tenantId } = useTenantAdmin();
  const isSuper = tenantId === null;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground">Title</label>
          <p className="mt-1 text-sm font-medium">{page.title}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground">Slug</label>
          <p className="mt-1 text-sm font-mono text-muted-foreground">{page.slug}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground">Status</label>
          <div className="mt-1">
            <span
              className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                page.is_published
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {page.is_published ? "Published" : "Draft"}
            </span>
          </div>
        </div>

        {page.is_homepage && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Homepage</label>
            <p className="mt-1 text-sm">✓ Yes, this is the homepage</p>
          </div>
        )}

        {isSuper && page.tenants && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Tenant</label>
            <div className="mt-1">
              <p className="text-sm font-medium">{page.tenants.name}</p>
              <p className="text-xs text-muted-foreground">{page.tenants.domain}</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground">Created</label>
          <p className="mt-1 text-sm">{new Date(page.created_at).toLocaleString()}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground">Updated</label>
          <p className="mt-1 text-sm">{new Date(page.updated_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default function PagesPage() {
  const { tenantId } = useTenantAdmin();
  const isSuper = tenantId === null;

  return (
    <Resource<PageRecord>
      resource="pages"
      title={isSuper ? "All Pages" : "Pages"}
      subtitle={isSuper ? "Manage pages across all tenants" : "Manage pages for this site"}
      searchField="title"
      searchPlaceholder="Search by title…"
      canCreate={!isSuper}
      canEdit={!isSuper}
      canDelete={!isSuper}
      canSort
      select={isSuper ? "*, tenants(id, name, domain)" : "*"}
      filters={isSuper ? undefined : [{ field: "tenant_id", operator: "eq", value: tenantId }]}
      columns={
        isSuper
          ? [
              { key: "title", label: "Title" },
              { key: "slug", label: "Slug" },
              {
                key: "is_published",
                label: "Status",
                render: (value) => {
                  const isPublished = Boolean(value);
                  return (
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                        isPublished
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {isPublished ? "Published" : "Draft"}
                    </span>
                  );
                },
              },
              {
                key: "is_homepage",
                label: "Homepage",
                render: (value) => {
                  return (
                    <span className="text-xs text-muted-foreground">
                      {Boolean(value) ? "✓" : "—"}
                    </span>
                  );
                },
              },
              {
                key: "tenants",
                label: "Tenant",
                render: (value, row: Record<string, unknown>) => {
                  const tenants = row.tenants as { name?: string } | undefined;
                  const tenantName = tenants?.name ? String(tenants.name) : "—";
                  return <span className="text-xs">{tenantName}</span>;
                },
              },
              { key: "created_at", label: "Created", render: DateCell, sortable: true },
            ]
          : [
              { key: "title", label: "Title" },
              { key: "slug", label: "Slug" },
              {
                key: "is_published",
                label: "Status",
                render: (value) => {
                  const isPublished = Boolean(value);
                  return (
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                        isPublished
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {isPublished ? "Published" : "Draft"}
                    </span>
                  );
                },
              },
              {
                key: "is_homepage",
                label: "Homepage",
                render: (value) => {
                  return (
                    <span className="text-xs text-muted-foreground">
                      {Boolean(value) ? "✓" : "—"}
                    </span>
                  );
                },
              },
              { key: "created_at", label: "Created", render: DateCell, sortable: true },
            ]
      }
      sidePanel={{
        icon: "article",
        title: "Page Details",
        subtitle: (row) => (row as PageRecord).title,
        view: (row) => <PageDetailsPanel page={row as PageRecord} />,
        width: "md",
      }}
    />
  );
}
