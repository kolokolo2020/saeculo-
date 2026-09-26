"use client";

import { useEffect } from "react";
import { useBalloonStore } from "./balloonStore";
import Glyph from "@/components/ui/Glyph";

const SHOW_MS = 9000;

// The notification balloon that pops out of the system tray.
export default function TrayBalloon() {
  const balloon = useBalloonStore((s) => s.balloon);
  const dismiss = useBalloonStore((s) => s.dismiss);

  useEffect(() => {
    if (!balloon) return;
    const t = setTimeout(dismiss, SHOW_MS);
    return () => clearTimeout(t);
  }, [balloon, dismiss]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed right-2 bottom-12 z-[9500] max-w-[300px]">
      {balloon && (
        <div
          key={balloon.id}
          className="aero-open pointer-events-auto relative rounded-[6px] border border-[#6a7f99] bg-gradient-to-b from-white to-[#e8eff8] px-3 py-2.5 pr-8 text-ink shadow-[0_4px_14px_rgba(0,0,0,0.4)]"
        >
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-gradient-to-b from-[#6fb4ff] to-[#1f6fd1] text-[10px] font-bold text-white">
              i
            </span>
            {balloon.title}
          </p>
          <p className="mt-1 text-[12px] leading-snug text-[#33415a]">{balloon.body}</p>
          <button
            onClick={dismiss}
            aria-label="Close notification"
            className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-[3px] text-[#55657a] hover:bg-[#dbe7f5]"
          >
            <Glyph name="close" size={9} />
          </button>
          {/* the tail pointing down at the tray */}
          <span className="absolute -bottom-[7px] right-10 h-3 w-3 rotate-45 border-r border-b border-[#6a7f99] bg-[#e8eff8]" />
        </div>
      )}
    </div>
  );
}
