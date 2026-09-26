"use client";

import { useState } from "react";
import {
  GLASS_COLORS,
  WALLPAPERS,
  usePersonalizeStore,
  type Look,
} from "@/components/desktop/personalizeStore";
import { useWindowStore } from "@/components/window-manager/windowStore";

// "Window Color and Appearance": pick a glass tint, toggle transparency,
// choose a desktop background. Every change previews live; Cancel puts
// back whatever was set when the window opened.
export default function PersonalizeApp() {
  const glass = usePersonalizeStore((s) => s.glass);
  const wallpaper = usePersonalizeStore((s) => s.wallpaper);
  const transparency = usePersonalizeStore((s) => s.transparency);
  const apply = usePersonalizeStore((s) => s.set);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const [original] = useState<Look>(() => {
    const now = usePersonalizeStore.getState();
    return { glass: now.glass, wallpaper: now.wallpaper, transparency: now.transparency };
  });

  return (
    <div className="flex h-full flex-col text-ink">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <h3 className="text-[17px] text-[#1e3287]">Window Color and Appearance</h3>
        <p className="mt-0.5 text-[12px] text-mute">
          Pick the glass color for windows, and a background for the desktop. Changes apply as you click.
        </p>

        <div className="mt-4 flex flex-wrap gap-3" role="group" aria-label="Glass color">
          {GLASS_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => apply({ glass: c.id })}
              aria-pressed={glass === c.id}
              aria-label={`Glass color ${c.label}`}
              className="group flex flex-col items-center gap-1"
            >
              <span
                className={`block h-11 w-11 rounded-[5px] border ${
                  glass === c.id ? "border-[#1e3287] ring-2 ring-[#6fb4ff] ring-offset-1" : "border-[#8a96a6]"
                }`}
                style={{
                  background: `linear-gradient(to bottom, rgba(255,255,255,0.75), ${c.swatch} 48%, ${c.swatch})`,
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)",
                }}
              />
              <span className="text-[11px] text-mute group-aria-pressed:text-ink">{c.label}</span>
            </button>
          ))}
        </div>

        <label className="mt-4 flex w-fit items-center gap-2 text-[12.5px]">
          <input
            type="checkbox"
            checked={transparency}
            onChange={(e) => apply({ transparency: e.target.checked })}
            className="h-3.5 w-3.5 accent-[#1f6fd1]"
          />
          Enable transparency
        </label>

        <h3 className="mt-5 text-[15px] text-[#1e3287]">Desktop Background</h3>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Desktop background">
          {WALLPAPERS.map((w) => (
            <button
              key={w.id}
              onClick={() => apply({ wallpaper: w.id })}
              aria-pressed={wallpaper === w.id}
              aria-label={`Background ${w.label}`}
              className="flex flex-col items-center gap-1"
            >
              {/* a live miniature: data-wall scopes the wallpaper variables to this tile */}
              <span
                data-wall={w.id}
                className={`aero-wallpaper relative block h-16 w-full overflow-hidden rounded-[3px] border ${
                  wallpaper === w.id ? "border-[#1e3287] ring-2 ring-[#6fb4ff] ring-offset-1" : "border-[#8a96a6]"
                }`}
              >
                <span className="aero-ribbon aero-ribbon-a [animation:none]" />
              </span>
              <span className="text-[11px] text-mute">{w.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-[#d4dbe4] bg-[#f1f5fa] px-4 py-2.5">
        <button onClick={() => closeWindow("personalize")} className="aero-btn aero-btn-primary w-20 py-1 text-[12px]">
          OK
        </button>
        <button
          onClick={() => {
            apply(original);
            closeWindow("personalize");
          }}
          className="aero-btn w-20 py-1 text-[12px]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
