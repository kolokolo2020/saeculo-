"use client";

import { useRef, useState } from "react";
import { PROFILE } from "@/data/profile";
import { useSiteStore } from "./siteStore";
import { LIMITS, mailtoFor, validateContact, type ContactErrors, type ContactInput } from "@/lib/contact";

// A short form that hands the message to the visitor's own email app: Send
// opens a new email to saeculo with the subject and message filled in, and
// they press send there. Replies go to whatever address they send from.
// "lease this" in Beats opens it about that beat: the beat shows at the top
// and goes in the email's subject.

export default function ContactWindow() {
  const [fields, setForm] = useState<ContactInput>({ name: "", message: "" });
  const beat = useSiteStore((s) => s.contactBeat);
  const form: ContactInput = { ...fields, beat: beat ?? undefined };
  const [errors, setErrors] = useState<ContactErrors>({});
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const set = (k: keyof ContactInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateContact(form);
    setErrors(found);
    const first = (["name", "message"] as const).find((k) => found[k]);
    if (first) {
      ({ name: nameRef, message: messageRef })[first].current?.focus();
      return;
    }
    // a real link click: the browser hands it to the email app without leaving the page
    const a = document.createElement("a");
    a.href = mailtoFor(PROFILE.bookingEmail, form);
    a.dataset.testid = "contact-mailto";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setOpened(true);
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

  const field = (k: keyof ContactInput, label: string, input: React.ReactNode) => (
    <div className={`flex flex-col gap-1.5 ${k === "message" ? "sm:min-h-0 sm:flex-1" : ""}`}>
      <label htmlFor={`contact-${k}`} className="text-[13px] font-semibold">
        {label}
      </label>
      {input}
      {errors[k] && (
        <p id={`contact-${k}-error`} className="text-[12.5px] text-rust">
          {errors[k]}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto bg-cream p-4">
      {beat && (
        <p className="flex items-center justify-between gap-2 rounded-[8px] border border-rule bg-cream-2 px-3 py-2 text-[13px]" data-testid="contact-beat">
          <span className="min-w-0 truncate">
            About leasing <span className="font-semibold">{beat}</span>
          </span>
          <button type="button" className="shrink-0 rounded-[3px] text-[12.5px] underline decoration-dotted underline-offset-2" onClick={() => useSiteStore.getState().askAbout(null)}>
            just a message
          </button>
        </p>
      )}
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
        "message",
        "Message",
        <textarea
          ref={messageRef}
          id="contact-message"
          className="field min-h-[120px] flex-1 resize-none"
          rows={8}
          placeholder={beat ? "What it's for (a song, a video, a release) and anything else saeculo should know." : undefined}
          maxLength={LIMITS.message}
          value={form.message}
          onChange={set("message")}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
        />,
      )}

      {opened && (
        <div role="status" className="rounded-[8px] border border-rule bg-cream-2 p-3 text-[12.5px]" data-testid="contact-opened">
          <p className="font-semibold">Your email app should have opened with the message. Press send there.</p>
          <p className="mt-1">
            Nothing happened? Write to{" "}
            <a className="underline underline-offset-2" href={mailtoFor(PROFILE.bookingEmail, form)}>
              {PROFILE.bookingEmail}
            </a>{" "}
            <button type="button" className="rounded-[3px] underline decoration-dotted underline-offset-2" onClick={copy}>
              {copied ? "(copied)" : "(copy)"}
            </button>
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[12.5px] text-ink-2">
          or write to <span className="select-all">{PROFILE.bookingEmail}</span>
        </span>
        <button type="submit" className="btn btn-primary min-w-[96px]" data-testid="contact-send">
          Send
        </button>
      </div>
    </form>
  );
}
