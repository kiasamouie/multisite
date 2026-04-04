import { NextResponse, type NextRequest } from "next/server";
import { trackEvent } from "@repo/lib/events/track";
import { rateLimit } from "@repo/lib/ratelimit";
import type { Json } from "@repo/lib/supabase/types";
import { z } from "zod";

const eventSchema = z.object({
  tenantId: z.number().int().positive(),
  eventType: z.string().min(1).max(100),
  data: z.record(z.unknown()).default({}),
  userId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success } = await rateLimit(`events:${ip}`, 30, 60_000);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await trackEvent(
      parsed.data.tenantId,
      parsed.data.eventType,
      parsed.data.data as Record<string, Json | undefined>,
      parsed.data.userId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[events/track] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
