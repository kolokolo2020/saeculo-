// The contact form's rules. The message is sent from the visitor's own
// email app (a mailto: link), so there's no server and nothing to configure.
export interface ContactInput {
  name: string;
  message: string;
}

export type ContactErrors = Partial<Record<keyof ContactInput, string>>;

export const LIMITS = { name: 100, message: 1800, messageMin: 10 };

export function validateContact(input: ContactInput): ContactErrors {
  const errors: ContactErrors = {};
  const name = input.name.trim();
  const message = input.message.trim();
  if (!name) errors.name = "Add your name (or artist name).";
  else if (name.length > LIMITS.name) errors.name = `Keep it under ${LIMITS.name} characters.`;
  if (!message) errors.message = "Write a message.";
  else if (message.length < LIMITS.messageMin) errors.message = "A little more detail, please.";
  else if (message.length > LIMITS.message) errors.message = `Keep it under ${LIMITS.message} characters.`;
  return errors;
}

/** The mailto: link that opens the visitor's email app with the message written. */
export function mailtoFor(to: string, input: ContactInput): string {
  const name = input.name.trim();
  const subject = `Message from ${name || "the site"}`;
  const body = `${input.message.trim()}\n\n${name}`;
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
