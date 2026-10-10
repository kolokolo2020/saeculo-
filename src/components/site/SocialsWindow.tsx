"use client";

import { useState } from "react";
import { PROFILE } from "@/data/profile";

// The links, with room to breathe, and (if one is set in profile.ts) a
// single video that loads only when someone asks for it.
function Video({ id, title }: { id: string; title: string }) {
  const [on, setOn] = useState(false);
  if (on) {
    return (
      <iframe
        className="aspect-video w-full rounded-[8px] border border-line bg-black"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1`}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <button
      className="group relative block aspect-video w-full overflow-hidden rounded-[8px] border border-line bg-black text-left"
      onClick={() => setOn(true)}
      aria-label={`Play video: ${title} (loads YouTube)`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`} alt="" className="h-full w-full object-cover opacity-70 group-hover:opacity-90" />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 text-[13px] text-white">
        ▶ {title}
        <span className="block text-[11px] text-white/60">loads from YouTube when clicked</span>
      </span>
    </button>
  );
}

export default function SocialsWindow() {
  const video = PROFILE.featuredVideo;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-cream">
      <ul className="px-2 py-2">
        {PROFILE.socials.map((s, i) => (
          <li key={s.label} className={i ? "border-t border-rule" : ""}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group my-0.5 flex items-baseline justify-between gap-4 rounded-[8px] px-3 py-3 hover:bg-cream-2 focus-visible:bg-cream-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-dusk"
            >
              <span className="text-[16px] text-ink group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">{s.label}</span>
              <span className="truncate font-mono text-[12.5px] text-ink-2">
                {s.handle} <span aria-hidden>↗</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      {video && (
        <div className="px-5 pb-5">
          <Video id={video.id} title={video.title} />
        </div>
      )}
    </div>
  );
}
