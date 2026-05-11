import "server-only";
import { Resend } from "resend";
import { env, SHOP } from "@/lib/env";
import { formatDateTimeLabel } from "@/lib/availability";
import { formatPhone } from "@/lib/phone";
import { formatPriceCents } from "@/lib/utils";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

type BookingEmailArgs = {
  to: string;
  customerName: string;
  barberName: string;
  serviceName: string;
  startsAt: string;
  priceCents: number;
  durationMinutes: number;
};

export async function sendBookingConfirmation(args: BookingEmailArgs) {
  if (!resend) {
    console.warn(
      "[email] RESEND_API_KEY not set — skipping confirmation email",
    );
    return;
  }
  const when = formatDateTimeLabel(args.startsAt);
  await resend.emails.send({
    from: env.resendFromEmail,
    to: args.to,
    subject: `Your ${SHOP.name} booking is confirmed — ${when}`,
    html: bookingHtml({ ...args, when, kind: "confirmation" }),
  });
}

export async function sendBookingReminder(args: BookingEmailArgs) {
  if (!resend) return;
  const when = formatDateTimeLabel(args.startsAt);
  await resend.emails.send({
    from: env.resendFromEmail,
    to: args.to,
    subject: `Reminder: ${SHOP.name} tomorrow at ${when}`,
    html: bookingHtml({ ...args, when, kind: "reminder" }),
  });
}

export async function sendLoginCodeEmail(args: {
  to: string;
  code: string;
}) {
  if (!resend) {
    console.warn(
      "[email] RESEND_API_KEY not set — login code:",
      args.code,
    );
    return;
  }
  await resend.emails.send({
    from: env.resendFromEmail,
    to: args.to,
    subject: `Your ${SHOP.name} sign-in code: ${args.code}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: auto; padding: 24px;">
        <h2>Your sign-in code</h2>
        <p>Enter this 6-digit code to view your bookings:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #f5f5f4; border-radius: 8px; text-align: center;">
          ${args.code}
        </div>
        <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">Expires in 10 minutes. If you didn't request this, ignore the email.</p>
      </div>
    `,
  });
}

function bookingHtml(
  args: BookingEmailArgs & {
    when: string;
    kind: "confirmation" | "reminder";
  },
) {
  const heading =
    args.kind === "confirmation" ? "You're booked." : "See you tomorrow.";
  const intro =
    args.kind === "confirmation"
      ? `Thanks, ${args.customerName}. Here are your appointment details:`
      : `Hi ${args.customerName}, this is a friendly reminder of your upcoming appointment:`;
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: auto; padding: 24px; color: #1f2937;">
      <h1 style="margin: 0 0 8px;">${heading}</h1>
      <p style="color: #4b5563;">${intro}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #6b7280;">When</td><td style="padding: 8px 0; text-align: right;"><strong>${args.when}</strong></td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Barber</td><td style="padding: 8px 0; text-align: right;"><strong>${args.barberName}</strong></td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Service</td><td style="padding: 8px 0; text-align: right;"><strong>${args.serviceName}</strong> (${args.durationMinutes} min)</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Price</td><td style="padding: 8px 0; text-align: right;"><strong>${formatPriceCents(args.priceCents)}</strong></td></tr>
      </table>
      <p style="color: #4b5563;">Need to cancel or reschedule? Call us at <a href="tel:${SHOP.phoneE164}">${formatPhone(SHOP.phoneE164)}</a>.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      <p style="color: #6b7280; font-size: 13px;">${SHOP.name} · ${SHOP.address}</p>
    </div>
  `;
}
