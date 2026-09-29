"use client";

import { useRef, useState } from "react";
import { PROFILE } from "@/data/profile";
import { LIMITS, validateContact, type ContactErrors, type ContactInput } from "@/lib/contact";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "failed"; reason: "not_configured" | "delivery_failed" | "rate_limited" | "network" };

const FAILURE: Record<Exclude<Status, { kind: "idle" | "sending" | "sent" }>["reason"], string> = {
  not_configured: "The online form isn't switched on yet, so your message was not sent.",
  delivery_failed: "The mail service didn't accept it, so your message was not sent.",
  rate_limited: "Too many messages from here in a short time. Your message was not sent.",
  network: "Couldn't reach the server, so your message was not sent.",
};

export default function ContactWindow() {
  const [form, setForm] = useState<ContactInput>({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const honey = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const set = (k: keyof ContactInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateContact(form);
    setErrors(found);
    const first = (["name", "email", "message"] as const).find((k) => found[k]);
    if (first) {
      ({ name: nameRef, email: emailRef, message: messageRef })[first].current?.focus();
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, website: honey.current?.value ?? "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus({ kind: "sent" });
        setForm({ name: "", email: "", message: "" });
      } else if (data.error === "invalid" && data.fields) {
        setErrors(data.fields);
        setStatus({ kind: "idle" });
      } else {
        setStatus({ kind: "failed", reason: data.error in FAILURE ? data.error : "delivery_failed" });
      }
    } catch {
      setStatus({ kind: "failed", reason: "network" });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.bookingEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // the address is on screen and selectable anyway
    }
  };

  const mailto = `mailto:${PROFILE.bookingEmail}?subject=${encodeURIComponent(`Message from ${form.name.trim() || "the site"}`)}&body=${encodeURIComponent(form.message)}`;

  if (status.kind === "sent") {
    return (
      <div className="bevel-field flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center" role="status">
        <p className="text-[16px] text-ink">Sent. Thank you.</p>
        <p className="max-w-[28ch] text-mute">It went to saeculo&apos;s inbox. Replies come to the email you gave.</p>
        <button className="btn mt-2" onClick={() => setStatus({ kind: "idle" })}>
          Write another
        </button>
      </div>
    );
  }

  const field = (k: keyof ContactInput, label: string, input: React.ReactNode) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`contact-${k}`} className="text-[12.5px] font-bold">
        {label}
      </label>
      {input}
      {errors[k] && (
        <p id={`contact-${k}-error`} className="text-[12.5px] text-alert">
          {errors[k]}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      {field(
        "name",
        "Name",
        <input
          ref={nameRef}
          id="contact-name"
          className="field"
          autoComplete="name"
          maxLength={LIMITS.name}
          value={form.name}
          onChange={set("name")}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "contact-name-error" : undefined}
        />,
      )}
      {field(
        "email",
        "Email",
        <input
          ref={emailRef}
          id="contact-email"
          className="field"
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={LIMITS.email}
          value={form.email}
          onChange={set("email")}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
        />,
      )}
      {field(
        "message",
        "Message",
        <textarea
          ref={messageRef}
          id="contact-message"
          className="field min-h-[120px] flex-1 resize-none"
          rows={5}
          maxLength={LIMITS.message}
          value={form.message}
          onChange={set("message")}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
        />,
      )}
      {/* a field only bots see */}
      <input ref={honey} name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      {status.kind === "failed" && (
        <div role="alert" className="border border-alert bg-[#fbeeea] p-2.5 text-[12.5px]">
          <p className="font-bold">{FAILURE[status.reason]}</p>
          <p className="mt-1">
            Email it instead:{" "}
            <a className="underline" href={mailto}>
              {PROFILE.bookingEmail}
            </a>{" "}
            <button type="button" className="underline decoration-dotted" onClick={copy}>
              {copied ? "(copied)" : "(copy)"}
            </button>
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[12px] text-mute">
          or write to <span className="select-all">{PROFILE.bookingEmail}</span>
        </span>
        <button type="submit" className="btn min-w-[96px] font-bold" disabled={status.kind === "sending"}>
          {status.kind === "sending" ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
