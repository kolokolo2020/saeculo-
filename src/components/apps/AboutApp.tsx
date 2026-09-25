import { PROFILE } from "@/data/profile";

const MENU = ["File", "Edit", "Format", "View", "Help"];

// about.txt, open in Notepad. The bio is real selectable text (not a
// textarea) so the links at the bottom stay clickable.
export default function AboutApp() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-3 border-b border-[#d4dbe4] bg-[#f5f7fa] px-2 py-0.5 text-[12px] text-ink" aria-hidden>
        {MENU.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <article className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-[13.5px] leading-relaxed text-[#111]">
        <p className="font-semibold">
          {PROFILE.artistName} — {PROFILE.tagline}
        </p>
        <p className="text-[#777]">{"=".repeat(28)}</p>
        {PROFILE.bio.map((paragraph, i) => (
          <p key={i} className="mt-3">
            {paragraph}
          </p>
        ))}
        <p className="mt-5 text-[#777]">-- links --</p>
        <ul>
          {PROFILE.socials.map((social) => (
            <li key={social.label}>
              <a
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0645ad] underline hover:text-[#0b2a5b]"
              >
                {social.label}
              </a>{" "}
              <span className="text-[#777]">{social.handle}</span>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
