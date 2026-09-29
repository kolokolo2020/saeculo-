import { PROFILE } from "@/data/profile";
import { validateContact, type ContactInput } from "@/lib/contact";

// Sends the contact form as an email through Resend (resend.com), using its
// HTTP API directly so there's no SDK to install. Configure on Vercel:
//   RESEND_API_KEY      required. Without it the form says it isn't set up
//                       and offers the address instead. Nothing is faked.
//   CONTACT_TO_EMAIL    optional, defaults to the booking email in profile.ts
//   CONTACT_FROM_EMAIL  optional, e.g. "saeculo site <contact@saeculobeats.com>"
//                       (a sender on a domain verified in Resend). Defaults
//                       to Resend's test sender, which only delivers to the
//                       Resend account's own address.

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > MAX_PER_WINDOW;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const input: ContactInput = { name: str(body.name), email: str(body.email), message: str(body.message) };

  // bots fill the hidden field; tell them it went fine and drop it
  if (str(body.website)) return Response.json({ ok: true });

  const errors = validateContact(input);
  if (Object.keys(errors).length) return Response.json({ error: "invalid", fields: errors }, { status: 400 });

  const key = process.env.RESEND_API_KEY;
  if (!key) return Response.json({ error: "not_configured" }, { status: 503 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return Response.json({ error: "rate_limited" }, { status: 429 });

  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL || "saeculo site <onboarding@resend.dev>",
        to: [process.env.CONTACT_TO_EMAIL || PROFILE.bookingEmail],
        reply_to: email,
        subject: `Message from ${name} (saeculo site)`,
        text: `${message}\n\n— ${name} <${email}>`,
        html: `<p style="white-space:pre-wrap">${escapeHtml(message)}</p><p>— ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error("contact: resend responded", res.status, await res.text().catch(() => ""));
      return Response.json({ error: "delivery_failed" }, { status: 502 });
    }
  } catch (err) {
    console.error("contact: send failed", err);
    return Response.json({ error: "delivery_failed" }, { status: 502 });
  }
  return Response.json({ ok: true });
}
