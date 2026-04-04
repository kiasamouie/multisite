import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";

/**
 * GET /api/admin/metrics/dashboard?tenantId=1
 *
 * Returns all dashboard data in a single request.
 * If tenantId is omitted, returns platform-wide aggregates (super admin only).
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const { admin, isPlatform, userId } = auth;

  const { searchParams } = new URL(request.url);
  const tenantIdParam = searchParams.get("tenantId");
  const tenantId = tenantIdParam ? parseInt(tenantIdParam, 10) : null;

  // Non-platform-admins must scope to their tenant
  if (!isPlatform) {
    if (!tenantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { data: membership } = await admin
      .from("memberships")
      .select("role")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .single();
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fmt = (d: Date) => d.toISOString();

  // ── Parallel fetches ────────────────────────────────────────────────────

  const [
    tenantsResult,
    subsResult,
    membersResult,
    pagesResult,
    mediaResult,
    eventsResult,
    auditResult,
    recentTenantsResult,
  ] = await Promise.all([
    // Total tenants (platform only)
    tenantId === null
      ? admin.from("tenants").select("id, name, plan, domain, created_at")
      : Promise.resolve({ data: null, error: null }),

    // Subscriptions
    (() => {
      let q = admin.from("subscriptions").select("id, status, tenant_id, created_at");
      if (tenantId) q = q.eq("tenant_id", tenantId);
      return q;
    })(),

    // Members
    (() => {
      let q = admin.from("memberships").select("id, role, tenant_id, created_at");
      if (tenantId) q = q.eq("tenant_id", tenantId);
      return q;
    })(),

    // Pages
    (() => {
      let q = admin.from("pages").select("id, tenant_id, is_published, created_at");
      if (tenantId) q = q.eq("tenant_id", tenantId);
      return q;
    })(),

    // Media
    (() => {
      let q = admin.from("media").select("id, tenant_id, size, created_at");
      if (tenantId) q = q.eq("tenant_id", tenantId);
      return q;
    })(),

    // Events (last 30 days for chart)
    (() => {
      let q = admin
        .from("events")
        .select("id, event_type, tenant_id, created_at")
        .gte("created_at", fmt(thirtyDaysAgo))
        .order("created_at", { ascending: true });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      return q;
    })(),

    // Audit logs (latest 8 for activity feed)
    (() => {
      let q = admin
        .from("audit_logs")
        .select("id, action, entity_type, entity_id, created_at, tenant_id")
        .order("created_at", { ascending: false })
        .limit(8);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      return q;
    })(),

    // Recently added tenants (platform only)
    tenantId === null
      ? admin
          .from("tenants")
          .select("id, name, domain, plan, created_at")
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: null, error: null }),
  ]);

  const tenants = (tenantsResult as { data: Array<{ id: number; name: string; plan: string; domain: string; created_at: string }> | null }).data ?? [];
  const subscriptions = subsResult.data ?? [];
  const members = membersResult.data ?? [];
  const pages = (pagesResult as { data: Array<{ id: number; tenant_id: number; is_published: boolean; created_at: string }> | null }).data ?? [];
  const media = (mediaResult as { data: Array<{ id: number; tenant_id: number; size: number | null; created_at: string }> | null }).data ?? [];
  const events = eventsResult.data ?? [];
  const auditLogs = auditResult.data ?? [];
  const recentTenants = (recentTenantsResult as { data: Array<{ id: number; name: string; domain: string; plan: string; created_at: string }> | null }).data ?? [];

  // ── Stat cards ─────────────────────────────────────────────────────────

  // Compute how many items were created in last 30 vs prior 30 days
  const countInRange = <T extends { created_at: string }>(
    arr: T[],
    from: Date,
    to: Date,
  ) =>
    arr.filter((x) => {
      const d = new Date(x.created_at);
      return d >= from && d <= to;
    }).length;

  const trendPct = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const tenants30 = countInRange(tenants, thirtyDaysAgo, now);
  const tenantsPrev30 = countInRange(tenants, sixtyDaysAgo, thirtyDaysAgo);
  const pages30 = countInRange(pages, thirtyDaysAgo, now);
  const pagesPrev30 = countInRange(pages, sixtyDaysAgo, thirtyDaysAgo);
  const media30 = countInRange(media, thirtyDaysAgo, now);
  const mediaPrev30 = countInRange(media, sixtyDaysAgo, thirtyDaysAgo);
  const members30 = countInRange(members, thirtyDaysAgo, now);
  const membersPrev30 = countInRange(members, sixtyDaysAgo, thirtyDaysAgo);

  const activeSubs = subscriptions.filter((s) => (s as { status: string }).status === "active").length;
  const trialSubs = subscriptions.filter((s) => (s as { status: string }).status === "trialing").length;
  const canceledSubs = subscriptions.filter((s) => (s as { status: string }).status === "canceled").length;

  const publishedPages = pages.filter((p) => p.is_published).length;

  const totalStorageBytes = media.reduce((sum, m) => sum + (m.size ?? 0), 0);
  const totalStorageMb = Math.round(totalStorageBytes / (1024 * 1024) * 10) / 10;

  // Platform-specific stats
  const planCounts = tenants.reduce<Record<string, number>>((acc, t) => {
    acc[t.plan] = (acc[t.plan] ?? 0) + 1;
    return acc;
  }, {});

  // ── Activity chart data (events bucketed by day, 30 days) ──────────────

  const dayBuckets: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayBuckets[key] = 0;
  }
  for (const ev of events) {
    const key = ev.created_at.slice(0, 10);
    if (key in dayBuckets) dayBuckets[key]++;
  }
  const activityChart = Object.entries(dayBuckets).map(([date, count]) => ({
    date,
    events: count,
  }));

  // Weekly buckets (last 7 days)
  const weekBuckets: Record<string, number> = {};
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    weekBuckets[key] = 0;
  }
  for (const ev of events) {
    const key = ev.created_at.slice(0, 10);
    if (key in weekBuckets) weekBuckets[key]++;
  }
  const weekChart = Object.entries(weekBuckets).map(([date, count]) => ({
    day: weekDays[new Date(date).getDay()],
    date,
    events: count,
  }));

  // ── Growth chart (entities created per day, last 30 days) ─────────────

  const growthBuckets: Record<string, number> = { ...dayBuckets };
  Object.keys(growthBuckets).forEach((k) => (growthBuckets[k] = 0));

  const growthSource = tenantId === null ? tenants : pages;
  for (const item of growthSource) {
    const key = item.created_at.slice(0, 10);
    if (key in growthBuckets) growthBuckets[key]++;
  }
  const growthChart = Object.entries(growthBuckets).map(([date, count]) => ({
    date: date.slice(5), // MM-DD
    value: count,
  }));

  // Cumulative growth
  let cumulative = tenantId === null
    ? tenants.filter((t) => new Date(t.created_at) < thirtyDaysAgo).length
    : pages.filter((p) => new Date(p.created_at) < thirtyDaysAgo).length;
  const cumulativeGrowth = growthChart.map((d) => {
    cumulative += d.value;
    return { date: d.date, total: cumulative, new: d.value };
  });

  // ── Subscription breakdown chart ───────────────────────────────────────

  const subStatusChart = [
    { name: "Active", value: activeSubs },
    { name: "Trialing", value: trialSubs },
    { name: "Canceled", value: canceledSubs },
  ].filter((d) => d.value > 0);

  // Plan breakdown chart (platform only)
  const planChart = Object.entries(planCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // ── Response ───────────────────────────────────────────────────────────

  return NextResponse.json({
    // Stat cards
    stats: tenantId === null
      ? [
          {
            id: "tenants",
            title: "Total Tenants",
            value: tenants.length,
            change: trendPct(tenants30, tenantsPrev30),
            changeLabel: "vs last 30 days",
            new30: tenants30,
            icon: "building",
          },
          {
            id: "subscriptions",
            title: "Active Subscriptions",
            value: activeSubs,
            change: trendPct(activeSubs, activeSubs - 0),
            changeLabel: `${trialSubs} trialing`,
            new30: activeSubs,
            icon: "credit-card",
          },
          {
            id: "members",
            title: "Total Members",
            value: members.length,
            change: trendPct(members30, membersPrev30),
            changeLabel: "vs last 30 days",
            new30: members30,
            icon: "users",
          },
          {
            id: "pages",
            title: "Published Pages",
            value: publishedPages,
            change: trendPct(pages30, pagesPrev30),
            changeLabel: `${pages.length} total`,
            new30: pages30,
            icon: "file-text",
          },
        ]
      : [
          {
            id: "pages",
            title: "Total Pages",
            value: pages.length,
            change: trendPct(pages30, pagesPrev30),
            changeLabel: "vs last 30 days",
            new30: pages30,
            icon: "file-text",
          },
          {
            id: "published",
            title: "Published",
            value: publishedPages,
            change: pages.length > 0 ? Math.round((publishedPages / pages.length) * 100) : 0,
            changeLabel: "% of total",
            new30: pages30,
            icon: "eye",
          },
          {
            id: "media",
            title: "Media Files",
            value: media.length,
            change: trendPct(media30, mediaPrev30),
            changeLabel: `${totalStorageMb} MB used`,
            new30: media30,
            icon: "image",
          },
          {
            id: "members",
            title: "Team Members",
            value: members.length,
            change: trendPct(members30, membersPrev30),
            changeLabel: "vs last 30 days",
            new30: members30,
            icon: "users",
          },
        ],

    // Charts
    charts: {
      activity: activityChart,
      week: weekChart,
      growth: cumulativeGrowth,
      plans: tenantId === null ? planChart : subStatusChart,
    },

    // Activity feed
    recentActivity: auditLogs,
    recentTenants,

    // Quick stats
    summary: {
      totalMedia: media.length,
      totalStorageMb,
      totalPages: pages.length,
      publishedPages,
      activeSubs,
      totalMembers: members.length,
      planCounts,
    },
  });
}
