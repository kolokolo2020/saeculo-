import { useId } from "react";
import type { WindowKind } from "@/lib/types";

// Glossy desktop-style icons, drawn as SVG so they stay crisp from the
// 16px title-bar size up to the 48px desktop size. Gradient ids are
// namespaced per instance — several copies of the same icon are on screen
// at once (desktop, taskbar, start menu, title bar).
export default function AppIcon({ kind, size = 48 }: { kind: WindowKind; size?: number }) {
  const raw = useId();
  const id = raw.replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `url(#${id}-${name})`;
  const gloss = (
    <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
      <stop offset="1" stopColor="#fff" stopOpacity="0" />
    </linearGradient>
  );
  const tile = (
    <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#4a5566" />
      <stop offset="0.5" stopColor="#1d2430" />
      <stop offset="1" stopColor="#0a0e14" />
    </linearGradient>
  );

  let body: React.ReactNode;
  switch (kind) {
    case "player":
      body = (
        <>
          <defs>
            <radialGradient id={`${id}-disc`} cx="0.5" cy="0.75" r="0.75">
              <stop offset="0" stopColor="#9fe8ff" />
              <stop offset="0.45" stopColor="#1f7ae0" />
              <stop offset="1" stopColor="#082a66" />
            </radialGradient>
            {gloss}
          </defs>
          <circle cx="24" cy="24" r="20" fill={u("disc")} stroke="#062050" strokeWidth="1.2" />
          <ellipse cx="24" cy="15" rx="14" ry="9" fill={u("gloss")} />
          <path d="M19 15.5v17l14-8.5z" fill="#fff" stroke="#0a3276" strokeWidth="0.8" strokeLinejoin="round" />
        </>
      );
      break;
    case "beatmaker":
      body = (
        <>
          <defs>
            {tile}
            {gloss}
          </defs>
          <rect x="4" y="6" width="40" height="36" rx="6" fill={u("tile")} stroke="#000" />
          {[0, 1, 2].flatMap((r) =>
            [0, 1, 2].map((c) => {
              const lit = (r + c) % 2 === 0;
              const colors = ["#39a6ff", "#5fd35f", "#f39a1e"];
              return (
                <rect
                  key={`${r}-${c}`}
                  x={9.5 + c * 10.5}
                  y={11 + r * 9.5}
                  width="8.5"
                  height="7.5"
                  rx="1.8"
                  fill={lit ? colors[r] : "#2b3442"}
                  stroke="#000"
                  strokeWidth="0.6"
                />
              );
            }),
          )}
          <rect x="5" y="7" width="38" height="13" rx="5" fill={u("gloss")} opacity="0.35" />
        </>
      );
      break;
    case "games":
      body = (
        <>
          <defs>
            <linearGradient id={`${id}-pad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f4f6f8" />
              <stop offset="0.5" stopColor="#b9c2cc" />
              <stop offset="1" stopColor="#7d8894" />
            </linearGradient>
            {gloss}
          </defs>
          <path
            d="M13 15h22a9 9 0 0 1 9 9l-1.5 9.5a5.5 5.5 0 0 1-10 2.2L30 31H18l-2.5 4.7a5.5 5.5 0 0 1-10-2.2L4 24a9 9 0 0 1 9-9z"
            fill={u("pad")}
            stroke="#3b4550"
            strokeWidth="1.1"
          />
          <path d="M11 21.5h3v3h3v3h-3v3h-3v-3H8v-3h3z" fill="#2b3442" />
          <circle cx="34" cy="21.5" r="2.2" fill="#5fd35f" />
          <circle cx="38.5" cy="25.5" r="2.2" fill="#e84a3a" />
          <circle cx="29.5" cy="25.5" r="2.2" fill="#39a6ff" />
          <circle cx="34" cy="29.5" r="2.2" fill="#f5c518" />
          <path d="M10 17h28a7 7 0 0 1 4 1.5" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </>
      );
      break;
    case "rhythm":
      body = (
        <>
          <defs>
            {tile}
            {gloss}
          </defs>
          <rect x="6" y="4" width="36" height="40" rx="5" fill={u("tile")} stroke="#000" />
          {[0, 1, 2].map((i) => (
            <line key={i} x1={15 + i * 9} y1="7" x2={15 + i * 9} y2="41" stroke="#3a4452" strokeWidth="0.8" />
          ))}
          <rect x="7.5" y="12" width="6" height="4" rx="1" fill="#f39a1e" />
          <rect x="16.5" y="21" width="6" height="4" rx="1" fill="#39a6ff" />
          <rect x="25.5" y="8" width="6" height="4" rx="1" fill="#5fd35f" />
          <rect x="34.5" y="28" width="6" height="4" rx="1" fill="#ff5fa2" />
          <rect x="7" y="35" width="34" height="2" rx="1" fill="#7fe0ff" />
          <rect x="7" y="5" width="34" height="12" rx="4" fill={u("gloss")} opacity="0.3" />
        </>
      );
      break;
    case "brawl":
      body = (
        <>
          <defs>
            <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#f0b35e" />
              <stop offset="0.5" stopColor="#c46f1c" />
              <stop offset="1" stopColor="#7a3d0c" />
            </linearGradient>
            {gloss}
          </defs>
          <path d="M18 5h12l9 38H9z" fill={u("wood")} stroke="#4a2305" strokeWidth="1" strokeLinejoin="round" />
          <path d="M20.5 12h7l5 26h-17z" fill="#2a1507" opacity="0.85" />
          <line x1="24" y1="36" x2="31" y2="11" stroke="#e6ecf2" strokeWidth="2" strokeLinecap="round" />
          <rect x="27.3" y="17.5" width="6" height="4" rx="1" transform="rotate(16 30 19.5)" fill="#d9412f" />
          <circle cx="24" cy="36" r="2" fill="#e6ecf2" />
          <path d="M18.5 6h11l1.5 6h-14z" fill={u("gloss")} opacity="0.6" />
        </>
      );
      break;
    case "pads":
      body = (
        <>
          <defs>
            {tile}
            {gloss}
          </defs>
          <rect x="3" y="8" width="42" height="32" rx="5" fill={u("tile")} stroke="#000" />
          {[0, 1].flatMap((r) =>
            [0, 1, 2, 3].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={7 + c * 9.5}
                y={13 + r * 12}
                width="7.5"
                height="9"
                rx="1.8"
                fill={r === 0 ? (c === 1 ? "#ffd27a" : "#f39a1e") : c === 2 ? "#9fe0ff" : "#2f7fe0"}
                stroke="#000"
                strokeWidth="0.6"
              />
            )),
          )}
          <rect x="4" y="9" width="40" height="12" rx="4" fill={u("gloss")} opacity="0.3" />
        </>
      );
      break;
    case "about":
      body = (
        <>
          <defs>
            <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#dfe7f0" />
            </linearGradient>
          </defs>
          <rect x="10" y="7" width="30" height="37" rx="1.5" fill="#000" opacity="0.2" />
          <rect x="8" y="5" width="30" height="37" rx="1.5" fill={u("paper")} stroke="#7d8da0" />
          <rect x="8" y="5" width="30" height="6" fill="#3d7bd6" />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={12 + i * 5.5} cy="5" r="1.6" fill="#fff" stroke="#556" strokeWidth="0.6" />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1="12" y1={17 + i * 5} x2={i === 4 ? 26 : 34} y2={17 + i * 5} stroke="#9fb7d4" strokeWidth="1.2" />
          ))}
        </>
      );
      break;
    case "contact":
      body = (
        <>
          <defs>
            <linearGradient id={`${id}-env`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#c9dcf2" />
            </linearGradient>
          </defs>
          <rect x="4" y="12" width="40" height="27" rx="2.5" fill={u("env")} stroke="#4a6a93" strokeWidth="1.1" />
          <path d="M5 13.5l19 14 19-14" fill="none" stroke="#4a6a93" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M5 37.5l14-11M43 37.5l-14-11" stroke="#8aa6c8" strokeWidth="1" />
          <rect x="33" y="15" width="7" height="8" rx="1" fill="#f39a1e" stroke="#a65c05" strokeWidth="0.6" />
        </>
      );
      break;
    case "recycle":
      body = (
        <>
          <defs>
            <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#bfe0ff" stopOpacity="0.55" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="1" stopColor="#8fb8e6" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          <path d="M10 12h28l-3.5 30h-21z" fill={u("glass")} stroke="#4a6a93" strokeWidth="1.1" strokeLinejoin="round" />
          <path d="M15 18c2 3 4 2 6 5s5 1 7 4" stroke="#9aa7b8" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={17 + i * 5} y1="16" x2={16.5 + i * 5.2} y2="39" stroke="#6f93bf" strokeWidth="0.8" opacity="0.7" />
          ))}
          <ellipse cx="24" cy="12" rx="14.5" ry="3.2" fill="#e6f2ff" stroke="#4a6a93" strokeWidth="1.1" />
        </>
      );
      break;
    case "personalize":
      body = (
        <>
          <defs>
            <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#6fb0f0" />
              <stop offset="0.35" stopColor="#4cc4bd" />
              <stop offset="0.65" stopColor="#9a86e8" />
              <stop offset="1" stopColor="#ea8fb4" />
            </linearGradient>
            {gloss}
          </defs>
          <rect x="4" y="7" width="40" height="28" rx="3" fill="#1d2430" stroke="#000" />
          <rect x="7" y="10" width="34" height="22" rx="1.5" fill={u("screen")} />
          <rect x="7" y="10" width="34" height="9" rx="1.5" fill={u("gloss")} opacity="0.5" />
          <path d="M19 35h10l2 6H17z" fill="#4a5566" stroke="#1d2430" strokeWidth="0.8" />
          <rect x="13" y="40.5" width="22" height="3" rx="1.5" fill="#6b7686" stroke="#1d2430" strokeWidth="0.8" />
        </>
      );
      break;
  }

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="shrink-0 drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]">
      {body}
    </svg>
  );
}
