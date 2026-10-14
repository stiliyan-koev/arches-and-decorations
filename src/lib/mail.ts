// Sending the /about contact form to the owner. Resend's REST API straight
// over fetch — one POST doesn't need an npm package.
//
// Setup, once: open a Resend account *with the address below*, create an API
// key, put it in RESEND_API_KEY (Netlify env vars for the live site, .env.local
// for dev). Until a real domain is verified in Resend, the sender has to stay
// onboarding@resend.dev and Resend only delivers to the account's own address —
// which is why the account has to be opened with this one.
const OWNER_EMAIL = "emiliya.uzunova194@gmail.com";

// Neither of these is ever shown on the site. The env vars are here so a dev
// can send to themselves, and so the sender can move to a real address the day
// the domain is verified — without a code change.
const TO = process.env.CONTACT_EMAIL_TO || OWNER_EMAIL;
const FROM = process.env.CONTACT_EMAIL_FROM || "onboarding@resend.dev";

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
    });

    if (!response.ok) {
      console.error(
        "Resend refused the message:",
        response.status,
        await response.text(),
      );
      return false;
    }
    return true;
  } catch (error) {
    // Network drop, DNS, Resend down.
    console.error("Could not reach Resend:", error);
    return false;
  }
}
