import "server-only";

// Emailing the owner: every request sent from /request (submitRequest) and the
// /about contact form. Resend's REST API straight over fetch — one POST
// doesn't need an npm package.
//
// Setup, once: a Resend account with the address below, an API key in
// RESEND_API_KEY (Netlify env vars for the live site, .env.local for dev), and
// ukrasivarna.com verified in Resend — which is what lets us send from our own
// domain instead of the shared onboarding@resend.dev. Everything goes to
// OWNER_EMAIL, the address that account was opened with.
const OWNER_EMAIL = "rent.arch.varna@gmail.com";

// Who it comes from. No mailbox is needed at this address — Resend sends from
// it because the domain is verified — but nothing can be read there either. The
// /about contact form asks for an email and sets reply_to to it, so a reply goes
// to the customer; a request from /request has no email field, so its email
// carries no reply_to and a reply to it bounces — the customer is reached on the
// phone number in the body.
const SENDER = "Хубавото балонче <zayavki@ukrasivarna.com>";

// Neither of these is ever shown on the site. The env vars are here so a dev
// can send to themselves, and so either address can move without a code change.
const TO = process.env.CONTACT_EMAIL_TO || OWNER_EMAIL;
const FROM = process.env.CONTACT_EMAIL_FROM || SENDER;

// true when Resend took the message. Never throws: the caller decides what the
// customer gets told, and a failure here must not look like a crash.
export async function sendOwnerEmail(
  subject: string,
  text: string,
  replyTo?: string,
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        subject,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      // Resend hanging must not hang the form. The catch below turns a timeout
      // into a plain false, same as any other network trouble.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      // Status only: Resend echoes the message back in its error body, and
      // that body would put the visitor's own words in the server log.
      console.error("Resend refused the message:", response.status);
      return false;
    }
    return true;
  } catch (error) {
    // Network drop, DNS, Resend down.
    console.error("Could not reach Resend:", error);
    return false;
  }
}
