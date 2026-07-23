import { PROFILE } from "@/data/profile";

export default function AboutApp() {
  return (
    <article className="font-body p-4 text-lg leading-relaxed text-black sm:p-5">
      <h3 className="font-pixel mb-4 text-xs text-[#000080]">
        {PROFILE.artistName} — {PROFILE.tagline}
      </h3>
      {PROFILE.bio.map((paragraph, i) => (
        <p key={i} className="mb-3">
          {paragraph}
        </p>
      ))}
      <p className="mt-5 border-t border-dashed border-[#808080] pt-3 text-base text-[#555]">
        [placeholder bio — the real story goes here]
      </p>
    </article>
  );
}
