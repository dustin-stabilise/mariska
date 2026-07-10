import { brand } from "@/lib/brand";
import { CARER_KEEPS_PCT, COMMISSION, formatGBP } from "@/lib/pricing";

/**
 * Email templates. Plain, warm, brand-toned HTML with no external assets
 * (images/fonts) so they render everywhere. All copy follows the no-em-dash
 * rule for public copy.
 */

function layout(title: string, bodyHtml: string): string {
  const c = brand.colors;
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:${c.cream};font-family:Georgia,serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;padding-bottom:20px;">
      <span style="font-size:22px;color:${c.ink};font-weight:600;">${brand.name}</span>
    </div>
    <div style="background:${c.card};border-radius:16px;padding:32px 28px;color:${c.ink};font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;">
      <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 16px;">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${c.faint};margin-top:20px;line-height:1.5;">
      ${brand.name} ${brand.regulationNote}
    </p>
  </div>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${href}" style="background:${brand.colors.green};color:${brand.colors.cream};padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:600;">${label}</a></p>`;
}

function appLink(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}

export function welcomeClientEmail(firstName: string) {
  return {
    subject: `Welcome to ${brand.name}`,
    html: layout(
      `Welcome, ${firstName}`,
      `<p>Your account is ready. You can browse fully vetted carers and nurses near you, arrange a free meet and greet, and book care by the hour, all in one place.</p>
       <p>Every professional has passed enhanced DBS, identity, right-to-work, reference and training checks before appearing in your search.</p>
       ${button(appLink("/app/search"), "Find your carer")}`
    ),
  };
}

export function welcomeProfessionalEmail(firstName: string) {
  return {
    subject: `Your ${brand.name} application`,
    html: layout(
      `Welcome, ${firstName}`,
      `<p>Thanks for applying to join ${brand.name}. The next step is your compliance documents: upload your DBS, right to work, references and training certificates from your dashboard, and we'll review them quickly.</p>
       <p>Once you're verified and we've had a short interview, your profile goes live. You set your own rate and keep ${CARER_KEEPS_PCT}% of it, paid through the platform.</p>
       ${button(appLink("/app/pro/documents"), "Upload your documents")}`
    ),
  };
}

export function interviewRequestedEmail(clientNotes?: string | null) {
  return {
    subject: `New meet & greet request on ${brand.name}`,
    html: layout(
      "A client would like to meet you",
      `<p>A client has requested a free meet and greet with you. ${clientNotes ? `They added a note: "${clientNotes}"` : ""}</p>
       <p>Accept the request and our team will coordinate a time that suits you both.</p>
       ${button(appLink("/app/pro/interviews"), "View the request")}`
    ),
  };
}

export function interviewAcceptedEmail(carerFirstName: string) {
  return {
    subject: `${carerFirstName} accepted your meet & greet`,
    html: layout(
      "Your meet & greet is on",
      `<p>${carerFirstName} has accepted your meet and greet request. Our team will be in touch to arrange a time, and you'll find the video link on your interviews page once it's scheduled.</p>
       ${button(appLink("/app/interviews"), "View your interviews")}`
    ),
  };
}

export function interviewScheduledEmail(when: string, videoUrl?: string | null) {
  return {
    subject: `Your meet & greet is scheduled`,
    html: layout(
      "Meet & greet scheduled",
      `<p>Your meet and greet has been scheduled for <strong>${when}</strong>.</p>
       ${videoUrl ? `<p>Join by video: <a href="${videoUrl}">${videoUrl}</a></p>` : ""}
       ${button(appLink("/app/interviews"), "View details")}`
    ),
  };
}

export function bookingProposedEmail(hours: number, carerNet: number) {
  return {
    subject: `New booking request on ${brand.name}`,
    html: layout(
      "You have a new booking request",
      `<p>A client has requested a booking of <strong>${hours} hours</strong>. You would receive <strong>${formatGBP(carerNet)}</strong> for this visit (your rate minus the ${COMMISSION.carerPct}% platform fee).</p>
       ${button(appLink("/app/pro/bookings"), "Respond to the request")}`
    ),
  };
}

export function bookingAcceptedEmail(carerFirstName: string, total: number) {
  return {
    subject: `${carerFirstName} accepted your booking`,
    html: layout(
      "Booking confirmed",
      `<p>${carerFirstName} has accepted your booking. Complete the payment of <strong>${formatGBP(total)}</strong> to confirm the visit.</p>
       ${button(appLink("/app/bookings"), "Pay and confirm")}`
    ),
  };
}

export function bookingPaidProEmail(hours: number, carerNet: number) {
  return {
    subject: "Booking paid and confirmed",
    html: layout(
      "You're booked",
      `<p>The client has paid for the <strong>${hours} hour</strong> booking. Your <strong>${formatGBP(carerNet)}</strong> will be paid out after the visit is completed.</p>
       ${button(appLink("/app/pro/bookings"), "View your bookings")}`
    ),
  };
}

export function complianceExpiryEmail(docLabel: string, daysLeft: number) {
  const urgency =
    daysLeft <= 0
      ? "has expired. Your profile is hidden from client searches until it's renewed."
      : daysLeft <= 7
        ? `expires in ${daysLeft} days. Your profile may be suspended if it isn't renewed.`
        : `expires in ${daysLeft} days. Renew it soon to stay visible to clients.`;
  return {
    subject:
      daysLeft <= 0
        ? `Action required: your ${docLabel} has expired`
        : `Your ${docLabel} expires in ${daysLeft} days`,
    html: layout(
      "Compliance reminder",
      `<p>Your <strong>${docLabel}</strong> ${urgency}</p>
       ${button(appLink("/app/pro/documents"), "Update your documents")}`
    ),
  };
}

export function availabilityDigestEmail(statusLabel: string, confirmUrl: string) {
  return {
    subject: "Still available this week? One tap to confirm",
    html: layout(
      "Your weekly availability check",
      `<p>Families only see carers whose availability is up to date. You're currently shown as <strong>${statusLabel}</strong>.</p>
       <p>If that's still right, one tap keeps you visible:</p>
       ${button(confirmUrl, "Yes, I'm still available")}
       <p style="font-size:13px;">Something changed? <a href="${appLink("/app/pro/availability")}">Update your availability</a> instead. Profiles unconfirmed for 30 days are hidden from search.</p>`
    ),
  };
}

