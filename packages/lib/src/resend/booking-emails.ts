import { sendEmail } from "./client";
import { bookingConfirmationEmail, bookingAlertEmail } from "./templates";
import { createAdminClient } from "../supabase/admin";

export interface BookingEmailData {
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  booking_date: string;
  booking_time: string;
  party_size: number;
  service_label?: string | null;
  special_notes?: string | null;
}

export interface TenantEmailContext {
  id: number;
  name: string;
  slug: string | null;
  from_email: string | null;
}

interface SendBookingEmailsOptions {
  tenant: TenantEmailContext;
  booking: BookingEmailData;
  supabase: ReturnType<typeof createAdminClient>;
  /** Override app domain (defaults to NEXT_PUBLIC_APP_DOMAIN env var) */
  appDomain?: string;
}

/**
 * Sends both the customer confirmation and the owner alert for a booking.
 * Safe to call fire-and-forget — individual send failures are caught and logged,
 * never thrown, so a broken owner email doesn't prevent the customer from
 * receiving their confirmation.
 */
export async function sendBookingEmails({
  tenant,
  booking,
  supabase,
  appDomain: appDomainArg,
}: SendBookingEmailsOptions): Promise<void> {
  const appDomain = appDomainArg ?? process.env.NEXT_PUBLIC_APP_DOMAIN ?? "localhost:3000";
  const fromEmail = tenant.from_email ?? undefined;

  const formattedDate = new Date(booking.booking_date + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const adminBookingsUrl = tenant.slug
    ? `https://${tenant.slug}.${appDomain}/admin/bookings`
    : `https://${appDomain}/admin/bookings`;

  // 1. Customer confirmation — errors propagate to caller
  await sendEmail({
    to: booking.customer_email,
    subject: `Booking Confirmed — ${tenant.name}`,
    fromEmail,
    html: bookingConfirmationEmail({
      customerName: booking.customer_name,
      businessName: tenant.name,
      bookingDate: formattedDate,
      bookingTime: booking.booking_time,
      partySize: booking.party_size,
      serviceLabel: booking.service_label ?? undefined,
      specialNotes: booking.special_notes ?? undefined,
    }),
  });

  // 2. Owner alert — look up tenant owner via memberships.
  //    Failure here is non-fatal (owner may not have a membership row yet).
  try {
    const { data: membership } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (membership?.user_id) {
      const { data: { user } } = await supabase.auth.admin.getUserById(membership.user_id);
      const ownerEmail = user?.email;

      if (ownerEmail) {
        await sendEmail({
          to: ownerEmail,
          subject: `New Booking from ${booking.customer_name} — ${formattedDate}`,
          fromEmail,
          html: bookingAlertEmail({
            businessName: tenant.name,
            customerName: booking.customer_name,
            customerEmail: booking.customer_email,
            customerPhone: booking.customer_phone ?? undefined,
            bookingDate: formattedDate,
            bookingTime: booking.booking_time,
            partySize: booking.party_size,
            serviceLabel: booking.service_label ?? undefined,
            specialNotes: booking.special_notes ?? undefined,
            adminBookingsUrl,
          }),
        });
      }
    }
  } catch (err) {
    // Owner alert failure is logged but not re-thrown — customer already got their email
    console.error("[booking-emails] Owner alert failed:", err);
  }
}
