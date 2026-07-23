"use client";

import { useWindowStore } from "@/components/window-manager/windowStore";
import { APPS } from "@/components/window-manager/windowRegistry";
import { PROFILE } from "@/data/profile";

export default function StartMenu({ onClose }: { onClose: () => void }) {
  const openWindow = useWindowStore((s) => s.openWindow);

  return (
    <>
      <div className="fixed inset-0 z-[9100]" onClick={onClose} aria-hidden />
      <nav
        aria-label="Start menu"
        className="bevel-out bg-chrome absolute bottom-10 left-0 z-[9200] flex w-56 max-md:w-[calc(100vw-2rem)] max-md:left-2"
      >
        <div className="font-pixel flex w-8 items-end justify-center bg-gradient-to-t from-[#000080] to-[#1084d0] pb-2 text-[10px] font-bold text-white [writing-mode:vertical-rl] rotate-180">
          {PROFILE.artistName} OS
        </div>
        <ul className="flex-1 py-1">
          {APPS.map((app) => (
            <li key={app.kind}>
              <button
                onClick={() => {
                  openWindow(app.kind);
                  onClose();
                }}
                className="font-body flex w-full items-center gap-3 px-3 py-2.5 text-left text-lg text-black hover:bg-[#000080] hover:text-white focus-visible:bg-[#000080] focus-visible:text-white focus:outline-none"
              >
                <span aria-hidden className="w-5 text-center">{app.icon}</span>
                {app.desktopLabel}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
