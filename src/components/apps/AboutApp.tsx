import { PROFILE } from "@/data/profile";

export default function AboutApp() {
  return (
    <div className="font-body flex h-full flex-col gap-3 text-base text-ink">
      {PROFILE.bio.map((paragraph, i) => (
        <p key={i} className={i === 0 ? "text-lg font-medium text-signal" : "text-ink/85"}>
          {paragraph}
        </p>
      ))}
      <ul className="font-readout mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-ink/10 pt-3 text-sm">
        {PROFILE.socials.map((social) => (
          <li key={social.label}>
            <a
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-bleed hover:text-signal"
            >
              {social.label} ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
