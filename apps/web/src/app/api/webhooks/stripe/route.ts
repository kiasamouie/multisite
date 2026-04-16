import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { getStripe } from "@repo/lib/stripe/client";
import { logger } from "@repo/lib/logger";
import { syncTenantPlan } from "@repo/lib/tenant/provisioning";
import type { PlanTier } from "@repo/lib/stripe/plans";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error("Stripe webhook signature verification failed", { error: message });
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantIdStr = session.metadata?.tenant_id;
        if (!tenantIdStr || !session.subscription) break;
        const tenantId = parseInt(tenantIdStr, 10);
        if (isNaN(tenantId)) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        await supabase.from("subscriptions").upsert(
          {
            tenant_id: tenantId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            status: subscription.status,
            price_id: subscription.items.data[0]?.price.id || "",
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          },
          { onConflict: "stripe_subscription_id" }
        );

        // Update tenant plan and sync flags/pages based on price
        const priceId = subscription.items.data[0]?.price.id;
        const plan = getPlanFromPriceId(priceId);
        if (plan) {
          await supabase
            .from("tenants")
            .update({ plan })
            .eq("id", tenantId);
          const syncResult = await syncTenantPlan(tenantId, plan);
          if (!syncResult.success) {
            logger.warn("Plan sync had errors on checkout", { tenantId, errors: syncResult.errors });
          }
        }

        logger.info("Subscription created", { tenant: tenantId, subscriptionId: subscription.id });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const newPriceId = subscription.items.data[0]?.price.id || "";

        await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            price_id: newPriceId,
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        // Resolve tenant and update plan + sync if the price tier changed
        const { data: subRow } = await supabase
          .from("subscriptions")
          .select("tenant_id")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        if (subRow) {
          const newPlan = getPlanFromPriceId(newPriceId);
          if (newPlan) {
            await supabase
              .from("tenants")
              .update({ plan: newPlan })
              .eq("id", subRow.tenant_id);
            const syncResult = await syncTenantPlan(subRow.tenant_id, newPlan);
            if (!syncResult.success) {
              logger.warn("Plan sync had errors on subscription update", {
                tenantId: subRow.tenant_id,
                errors: syncResult.errors,
              });
            }
          }
        }

        logger.info("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);

        // Downgrade tenant to starter and sync flags/pages
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("tenant_id")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        if (sub) {
          await supabase
            .from("tenants")
            .update({ plan: "starter" })
            .eq("id", sub.tenant_id);
          const syncResult = await syncTenantPlan(sub.tenant_id, "starter");
          if (!syncResult.success) {
            logger.warn("Plan sync had errors on subscription cancel", {
              tenantId: sub.tenant_id,
              errors: syncResult.errors,
            });
          }
        }

        logger.info("Subscription canceled", { subscriptionId: subscription.id });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string);
        }

        logger.warn("Payment failed", { invoiceId: invoice.id });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Stripe webhook handler error", { error: message, eventType: event.type });
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

function getPlanFromPriceId(priceId: string | undefined): "starter" | "growth" | "pro" | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_GROWTH) return "growth";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return null;
}
