interface ContactFormEmailData {
  name: string;
  email: string;
  message: string;
  tenantName: string;
}

export function contactFormEmail(data: ContactFormEmailData): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Contact Form Submission</h2>
      <p><strong>From:</strong> ${escapeHtml(data.name)} (${escapeHtml(data.email)})</p>
      <p><strong>Website:</strong> ${escapeHtml(data.tenantName)}</p>
      <hr />
      <p>${escapeHtml(data.message)}</p>
    </div>
  `;
}

interface BillingAlertEmailData {
  tenantName: string;
  status: string;
  message: string;
}

export function billingAlertEmail(data: BillingAlertEmailData): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Billing Alert - ${escapeHtml(data.tenantName)}</h2>
      <p><strong>Status:</strong> ${escapeHtml(data.status)}</p>
      <p>${escapeHtml(data.message)}</p>
    </div>
  `;
}

interface WelcomeEmailData {
  userName: string;
  tenantName: string;
  loginUrl: string;
}

export function welcomeEmail(data: WelcomeEmailData): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to ${escapeHtml(data.tenantName)}!</h2>
      <p>Hi ${escapeHtml(data.userName)},</p>
      <p>Your account has been created. You can log in to the admin panel at:</p>
      <p><a href="${escapeHtml(data.loginUrl)}">${escapeHtml(data.loginUrl)}</a></p>
    </div>
  `;
}

export interface BookingConfirmationEmailData {
  customerName: string;
  businessName: string;
  bookingDate: string;
  bookingTime: string;
  partySize: number;
  serviceLabel?: string;
  specialNotes?: string;
}

export function bookingConfirmationEmail(data: BookingConfirmationEmailData): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #1a1a1a; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <h2 style="color: #fff; margin: 0; font-size: 20px;">Booking Confirmed</h2>
        <p style="color: #aaa; margin: 4px 0 0; font-size: 14px;">${escapeHtml(data.businessName)}</p>
      </div>
      <div style="background: #f9f9f9; padding: 32px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 24px;">Hi <strong>${escapeHtml(data.customerName)}</strong>, your booking is confirmed.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #e5e5e5;">
            <td style="padding: 10px 0; font-weight: 600; color: #555; width: 140px;">Date</td>
            <td style="padding: 10px 0;">${escapeHtml(data.bookingDate)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e5e5;">
            <td style="padding: 10px 0; font-weight: 600; color: #555;">Time</td>
            <td style="padding: 10px 0;">${escapeHtml(data.bookingTime)}</td>
          </tr>
          ${data.partySize > 1 ? `<tr style="border-bottom: 1px solid #e5e5e5;"><td style="padding: 10px 0; font-weight: 600; color: #555;">Party Size</td><td style="padding: 10px 0;">${data.partySize} people</td></tr>` : ""}
          ${data.serviceLabel ? `<tr style="border-bottom: 1px solid #e5e5e5;"><td style="padding: 10px 0; font-weight: 600; color: #555;">Service</td><td style="padding: 10px 0;">${escapeHtml(data.serviceLabel)}</td></tr>` : ""}
          ${data.specialNotes ? `<tr><td style="padding: 10px 0; font-weight: 600; color: #555;">Notes</td><td style="padding: 10px 0;">${escapeHtml(data.specialNotes)}</td></tr>` : ""}
        </table>
        <p style="margin: 24px 0 0; font-size: 13px; color: #888;">
          Need to cancel or reschedule? Please contact us at least 24 hours before your booking.
        </p>
      </div>
    </div>
  `;
}

export interface BookingAlertEmailData {
  businessName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  bookingDate: string;
  bookingTime: string;
  partySize: number;
  serviceLabel?: string;
  specialNotes?: string;
  adminBookingsUrl: string;
}

export function bookingAlertEmail(data: BookingAlertEmailData): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #1a1a1a; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <h2 style="color: #fff; margin: 0; font-size: 20px;">New Booking</h2>
        <p style="color: #aaa; margin: 4px 0 0; font-size: 14px;">${escapeHtml(data.businessName)}</p>
      </div>
      <div style="background: #f9f9f9; padding: 32px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 24px; font-size: 14px; color: #555;">A new booking is awaiting confirmation.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #e5e5e5;">
            <td style="padding: 10px 0; font-weight: 600; color: #555; width: 140px;">Customer</td>
            <td style="padding: 10px 0;">${escapeHtml(data.customerName)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e5e5;">
            <td style="padding: 10px 0; font-weight: 600; color: #555;">Email</td>
            <td style="padding: 10px 0;">${escapeHtml(data.customerEmail)}</td>
          </tr>
          ${data.customerPhone ? `<tr style="border-bottom: 1px solid #e5e5e5;"><td style="padding: 10px 0; font-weight: 600; color: #555;">Phone</td><td style="padding: 10px 0;">${escapeHtml(data.customerPhone)}</td></tr>` : ""}
          <tr style="border-bottom: 1px solid #e5e5e5;">
            <td style="padding: 10px 0; font-weight: 600; color: #555;">Date</td>
            <td style="padding: 10px 0;">${escapeHtml(data.bookingDate)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e5e5;">
            <td style="padding: 10px 0; font-weight: 600; color: #555;">Time</td>
            <td style="padding: 10px 0;">${escapeHtml(data.bookingTime)}</td>
          </tr>
          ${data.partySize > 1 ? `<tr style="border-bottom: 1px solid #e5e5e5;"><td style="padding: 10px 0; font-weight: 600; color: #555;">Party Size</td><td style="padding: 10px 0;">${data.partySize} people</td></tr>` : ""}
          ${data.serviceLabel ? `<tr style="border-bottom: 1px solid #e5e5e5;"><td style="padding: 10px 0; font-weight: 600; color: #555;">Service</td><td style="padding: 10px 0;">${escapeHtml(data.serviceLabel)}</td></tr>` : ""}
          ${data.specialNotes ? `<tr><td style="padding: 10px 0; font-weight: 600; color: #555;">Notes</td><td style="padding: 10px 0;">${escapeHtml(data.specialNotes)}</td></tr>` : ""}
        </table>
        <div style="margin-top: 28px;">
          <a href="${escapeHtml(data.adminBookingsUrl)}"
             style="display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
            View Bookings in Admin →
          </a>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
