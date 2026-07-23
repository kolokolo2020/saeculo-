import { PROFILE } from "@/data/profile";

export default function ContactApp() {
  return (
    <div className="font-body p-4 text-lg text-black sm:p-5">
      <h3 className="font-pixel mb-4 text-xs text-[#000080]">get in touch</h3>
      <p className="mb-1 text-base text-[#555]">booking / collabs / licensing questions:</p>
      <a
        href={`mailto:${PROFILE.bookingEmail}`}
        className="bevel-out bg-chrome mb-5 inline-block px-3 py-1.5 text-black underline decoration-dotted hover:bg-[#d8d4cc] active:translate-y-px"
      >
        {PROFILE.bookingEmail}
      </a>
      <h4 className="font-pixel mb-3 text-[10px] text-[#000080]">find me on</h4>
      <ul className="space-y-2">
        {PROFILE.socials.map((social) => (
          <li key={social.label} className="flex items-center gap-2">
            <span aria-hidden className="text-[#000080]">▸</span>
            <a
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted hover:bg-[#000080] hover:text-white"
            >
              {social.label}
            </a>
            <span className="text-base text-[#555]">{social.handle}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-dashed border-[#808080] pt-3 text-base text-[#555]">
        [placeholder links — swap in your real profiles]
      </p>
    </div>
  );
}
