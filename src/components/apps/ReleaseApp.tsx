"use client";

import { useState } from "react";
import { PROFILE } from "@/data/profile";
import { formatLeft, releaseProgress } from "@/lib/release";
import { useNow } from "@/hooks/useNow";
import { useWindowStore } from "@/components/window-manager/windowStore";

// The countdown to the next drop, dressed as an old browser download
// dialog that is taking a very long time.
export default function ReleaseApp() {
  const now = useNow();
  const openWindow = useWindowStore((s) => s.openWindow);
  const [note, setNote] = useState<string | null>(null);
  const release = PROFILE.nextRelease;
  const progress = now ? releaseProgress(now) : null;

  if (!release) {
    return <p className="grid h-full place-items-center text-[12px] text-mute">No downloads in progress.</p>;
  }

  const percent = progress ? Math.floor(progress.fraction * 100) : 0;

  return (
    <div className="flex h-full flex-col text-ink">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-[12px]">
        <p className="text-[13px]">
          {progress?.done ? "Download complete" : `${percent}% of next_single.exe completed`}
        </p>
        <p className="mt-0.5 truncate text-mute">
          &quot;{release.title}&quot; from saeculo
        </p>
        <div
          className="aero-progress mt-3 h-4"
          role="progressbar"
          aria-label="Release countdown"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="aero-progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-mute">Estimated time left:</dt>
          <dd className="font-mono" aria-label="Time left">
            {!progress ? "Calculating…" : progress.done ? "0 sec" : formatLeft(progress)}
          </dd>
          <dt className="text-mute">Download to:</dt>
          <dd>your ears</dd>
          <dt className="text-mute">Transfer rate:</dt>
          <dd>{progress?.done ? "done" : "1 beat per second"}</dd>
        </dl>
        <p className="mt-2 h-4 text-[11.5px] text-[#86621d]" aria-live="polite">
          {note}
        </p>
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-[#d4dbe4] bg-[#f1f5fa] px-4 py-2.5">
        <button
          disabled={!progress?.done}
          onClick={() => {
            if (release.url) window.open(release.url, "_blank", "noopener,noreferrer");
            else openWindow("player");
          }}
          className="aero-btn aero-btn-primary w-20 py-1 text-[12px] disabled:opacity-50"
        >
          Open
        </button>
        <button onClick={() => openWindow("player")} className="aero-btn px-3 py-1 text-[12px]">
          Open Folder
        </button>
        <button
          onClick={() => setNote("This download cannot be cancelled. It's worth the wait.")}
          className="aero-btn w-20 py-1 text-[12px]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
