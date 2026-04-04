import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";

export type CardContext = "tenants" | "subscriptions" | "members" | "content" | "activity";

/**
 * GET /api/admin/metrics/card?context=tenants&tenantId=1
 *
 * Returns metric data for a specific context.
 * tenantId is optional — omitting it returns platform-wide aggregates.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  // Non-platform-admins can only see their own tenant data
  const { admin, isPlatform, userId } = auth;

  const { searchParams } = new URL(request.url);
  const context = searchParams.get("context") as CardContext | null;
  const tenantIdParam = searchParams.get("tenantId");
  const tenantId = tenantIdParam ? parseInt(tenantIdParam, 10) : null;

  if (!context) {
    return NextResponse.json({ error: "Missing context param" }, { status: 400 });
  }

  // If not a platform admin, scope to a specific tenant they belong to
  if (!isPlatform) {
    if (!tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { data: membership } = await admin
      .from("memberships")
      .select("role")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .single();
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  switch (context) {
    case "tenants": {
      let query = admin.from("tenants").select("id, name, domain, plan, created_at");
      if (tenantId) query = query.eq("id", tenantId);
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const planCounts = (data ?? []).reduce<Record<string, number>>((acc, t) => {
        acc[t.plan] = (acc[t.plan] ?? 0) + 1;
        return acc;
      }, {});

      return NextResponse.json({
        total: data?.length ?? 0,
        planCounts,
        tenants: data ?? [],
      });
    }

    case "subscriptions": {
      let query = admin.from("subscriptions").select("status, price_id, tenant_id");
      if (tenantId) query = query.eq("tenant_id", tenantId);
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const statusCounts = (data ?? []).reduce<Record<string, number>>((acc, s) => {
        acc[s.status] = (acc[s.status] ?? 0) + 1;
        return acc;
      }, {});

      const active = (data ?? []).filter((s) => s.status === "active").length;
      const trialing = (data ?? []).filter((s) => s.status === "trialing").length;
      const canceled = (data ?? []).filter((s) => s.status === "canceled").length;

      return NextResponse.json({
        total: data?.length ?? 0,
        active,
        trialing,
        canceled,
        statusCounts,
      });
    }

    case "members": {
      let query = admin.from("memberships").select("role, tenant_id, created_at");
      if (tenantId) query = query.eq("tenant_id", tenantId);
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const roleCounts = (data ?? []).reduce<Record<string, number>>((acc, m) => {
        acc[m.role] = (acc[m.role] ?? 0) + 1;
        return acc;
      }, {});

      return NextResponse.json({
        total: data?.length ?? 0,
        roleCounts,
      });
    }

    case "content": {
      // Count pages scoped by tenant (or all), then sections and blocks via joins
      let pagesQuery = admin.from("pages").select("id, tenant_id, is_published");
      if (tenantId) pagesQuery = pagesQuery.eq("tenant_id", tenantId);
      const { data: pages, error: pagesError } = await pagesQuery;
      if (pagesError) return NextResponse.json({ error: pagesError.message }, { status: 500 });

      const pageIds = (pages ?? []).map((p) => p.id);

      let sectionCount = 0;
      let blockCount = 0;

      if (pageIds.length > 0) {
        const { data: sections } = await admin
          .from("sections")
          .select("id, page_id")
          .in("page_id", pageIds);
        sectionCount = sections?.length ?? 0;

        const sectionIds = (sections ?? []).map((s) => s.id);
        if (sectionIds.length > 0) {
          const { data: blocks } = await admin
            .from("blocks")
            .select("id")
            .in("section_id", sectionIds);
          blockCount = blocks?.length ?? 0;
        }
      }

      let mediaQuery = admin.from("media").select("id");
      if (tenantId) mediaQuery = mediaQuery.eq("tenant_id", tenantId);
      const { data: media } = await mediaQuery;

      return NextResponse.json({
        pages: pages?.length ?? 0,
        publishedPages: (pages ?? []).filter((p) => p.is_published).length,
        sections: sectionCount,
        blocks: blockCount,
        media: media?.length ?? 0,
      });
    }

    case "activity": {
      let eventsQuery = admin
        .from("events")
        .select("id, event_type, created_at, tenant_id")
        .order("created_at", { ascending: false })
        .limit(20);
      if (tenantId) eventsQuery = eventsQuery.eq("tenant_id", tenantId);
      const { data: events, error: eventsError } = await eventsQuery;
      if (eventsError) return NextResponse.json({ error: eventsError.message }, { status: 500 });

      let auditQuery = admin
        .from("audit_logs")
        .select("id, action, entity_type, created_at, tenant_id")
        .order("created_at", { ascending: false })
        .limit(10);
      if (tenantId) auditQuery = auditQuery.eq("tenant_id", tenantId);
      const { data: auditLogs } = await auditQuery;

      return NextResponse.json({
        recentEvents: events ?? [],
        recentAuditLogs: auditLogs ?? [],
        eventCount: events?.length ?? 0,
      });
    }

    default:
      return NextResponse.json({ error: "Invalid context" }, { status: 400 });
  }
}
