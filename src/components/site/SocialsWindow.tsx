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
        className="aspect-video w-full bg-black"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1`}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <button
      className="group relative block aspect-video w-full overflow-hidden bg-black text-left"
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
    <div className="bevel-field flex min-h-0 flex-1 flex-col overflow-y-auto">
      <ul className="divide-y divide-[#ddd5c5] px-2 py-2">
        {PROFILE.socials.map((s) => (
          <li key={s.label}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-baseline justify-between gap-4 px-3 py-3.5 hover:bg-[#e8e1d2] focus-visible:bg-[#e8e1d2]"
            >
              <span className="text-[16px] text-ink group-hover:underline">{s.label}</span>
              <span className="truncate font-mono text-[12.5px] text-mute">
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
