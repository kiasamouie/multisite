import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";

export type ChartMetric = "growth" | "plans" | "storage" | "activity";
export type ChartPeriod = "week" | "month" | "year";

/**
 * GET /api/admin/metrics/chart?metric=growth&period=month&tenantId=1
 *
 * Returns time-series or categorical data for charting.
 * tenantId is optional — omitting it returns platform-wide data.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const { admin, isPlatform, userId } = auth;

  const { searchParams } = new URL(request.url);
  const metric = searchParams.get("metric") as ChartMetric | null;
  const period = (searchParams.get("period") ?? "month") as ChartPeriod;
  const tenantIdParam = searchParams.get("tenantId");
  const tenantId = tenantIdParam ? parseInt(tenantIdParam, 10) : null;

  if (!metric) {
    return NextResponse.json({ error: "Missing metric param" }, { status: 400 });
  }

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
  const periodMs: Record<ChartPeriod, number> = {
    week: 7,
    month: 30,
    year: 365,
  };
  const days = periodMs[period];
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const sinceISO = since.toISOString();

  switch (metric) {
    case "growth": {
      // Tenant (or content) creation over time bucketed by day
      if (!tenantId) {
        // Platform view: new tenants per day
        const { data, error } = await admin
          .from("tenants")
          .select("created_at")
          .gte("created_at", sinceISO)
          .order("created_at", { ascending: true });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const buckets = buildDayBuckets(since, now);
        for (const row of data ?? []) {
          const day = row.created_at.slice(0, 10);
          if (day in buckets) buckets[day]++;
        }

        return NextResponse.json({
          labels: Object.keys(buckets),
          datasets: [{ label: "New Tenants", data: Object.values(buckets) }],
        });
      } else {
        // Tenant view: new pages per day
        const { data, error } = await admin
          .from("pages")
          .select("created_at")
          .eq("tenant_id", tenantId)
          .gte("created_at", sinceISO)
          .order("created_at", { ascending: true });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const buckets = buildDayBuckets(since, now);
        for (const row of data ?? []) {
          const day = row.created_at.slice(0, 10);
          if (day in buckets) buckets[day]++;
        }

        return NextResponse.json({
          labels: Object.keys(buckets),
          datasets: [{ label: "New Pages", data: Object.values(buckets) }],
        });
      }
    }

    case "plans": {
      // Distribution of tenants by plan
      let query = admin.from("tenants").select("plan");
      if (tenantId) query = query.eq("id", tenantId);
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const counts: Record<string, number> = { starter: 0, growth: 0, pro: 0 };
      for (const t of data ?? []) {
        if (t.plan in counts) counts[t.plan]++;
      }

      return NextResponse.json({
        labels: Object.keys(counts),
        datasets: [{ label: "Plan Distribution", data: Object.values(counts) }],
      });
    }

    case "storage": {
      // Media asset count per tenant (proxy for storage usage)
      if (!tenantId) {
        // Platform view: top 10 tenants by media count
        const { data: tenants, error: tenantsError } = await admin
          .from("tenants")
          .select("id, name");
        if (tenantsError) return NextResponse.json({ error: tenantsError.message }, { status: 500 });

        const counts: { name: string; count: number }[] = [];
        for (const t of tenants ?? []) {
          const { count } = await admin
            .from("media")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", t.id)
            .then((r) => ({ count: r.count ?? 0 }));
          counts.push({ name: t.name, count });
        }

        counts.sort((a, b) => b.count - a.count);
        const top = counts.slice(0, 10);

        return NextResponse.json({
          labels: top.map((c) => c.name),
          datasets: [{ label: "Media Files", data: top.map((c) => c.count) }],
        });
      } else {
        // Tenant view: media uploads per day
        const { data, error } = await admin
          .from("media")
          .select("created_at")
          .eq("tenant_id", tenantId)
          .gte("created_at", sinceISO)
          .order("created_at", { ascending: true });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const buckets = buildDayBuckets(since, now);
        for (const row of data ?? []) {
          const day = row.created_at.slice(0, 10);
          if (day in buckets) buckets[day]++;
        }

        return NextResponse.json({
          labels: Object.keys(buckets),
          datasets: [{ label: "Media Uploads", data: Object.values(buckets) }],
        });
      }
    }

    case "activity": {
      // Events by type over the period
      let query = admin
        .from("events")
        .select("event_type")
        .gte("created_at", sinceISO);
      if (tenantId) query = query.eq("tenant_id", tenantId);
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const counts: Record<string, number> = {};
      for (const e of data ?? []) {
        counts[e.event_type] = (counts[e.event_type] ?? 0) + 1;
      }

      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);

      return NextResponse.json({
        labels: sorted.map(([k]) => k),
        datasets: [{ label: "Events", data: sorted.map(([, v]) => v) }],
      });
    }

    default:
      return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
  }
}

/** Build an object keyed by YYYY-MM-DD for each day in [from, to], initialized to 0 */
function buildDayBuckets(from: Date, to: Date): Record<string, number> {
  const buckets: Record<string, number> = {};
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= to) {
    buckets[cursor.toISOString().slice(0, 10)] = 0;
    cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
}
