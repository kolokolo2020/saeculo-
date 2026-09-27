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
    case "beatdeck":
      body = (
        <>
          <defs>
            <linearGradient id={`${id}-card`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#d7e3f1" />
            </linearGradient>
            <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3d8ee8" />
              <stop offset="1" stopColor="#0f3f86" />
            </linearGradient>
            {gloss}
          </defs>
          {/* a fanned hand of three cards */}
          <rect x="6" y="11" width="20" height="28" rx="2.5" transform="rotate(-18 16 25)" fill={u("card")} stroke="#4a6a93" />
          <rect x="22" y="11" width="20" height="28" rx="2.5" transform="rotate(16 32 25)" fill={u("card")} stroke="#4a6a93" />
          <rect x="14" y="7" width="20" height="30" rx="2.5" fill={u("face")} stroke="#0b2a5b" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={17.5 + i * 3.6} y={26 - [6, 11, 4, 8][i]} width="2.4" height={[6, 11, 4, 8][i]} rx="0.6" fill="#7fe0ff" />
          ))}
          <rect x="16" y="29" width="16" height="2" rx="1" fill="#ffd27a" />
          <rect x="15" y="8" width="18" height="10" rx="2" fill={u("gloss")} opacity="0.5" />
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
    case "welcome":
      body = (
        <>
          <defs>
            <radialGradient id={`${id}-orb`} cx="0.5" cy="0.35" r="0.7">
              <stop offset="0" stopColor="#bfe6ff" />
              <stop offset="0.55" stopColor="#1f6fd1" />
              <stop offset="1" stopColor="#0b2a5b" />
            </radialGradient>
            {gloss}
          </defs>
          <circle cx="24" cy="24" r="19" fill={u("orb")} stroke="#0b2a5b" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={15 + i * 5} y={30 - [6, 12, 9, 14][i]} width="3.2" height={[6, 12, 9, 14][i]} rx="1" fill="#fff" />
          ))}
          <ellipse cx="24" cy="15" rx="13" ry="7" fill={u("gloss")} opacity="0.55" />
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
    case "vault":
      body = (
        <>
          <defs>
            <linearGradient id={`${id}-folder`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe9a6" />
              <stop offset="1" stopColor="#e3a92b" />
            </linearGradient>
          </defs>
          <path d="M4 12a2 2 0 0 1 2-2h11l4 4h21a2 2 0 0 1 2 2v24a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill={u("folder")} stroke="#a5740f" strokeWidth="1" />
          <path d="M4 18h40" stroke="#fff3c9" strokeWidth="1" opacity="0.8" />
          {/* the zipper */}
          <rect x="21" y="14" width="6" height="28" fill="#6b7686" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={i % 2 ? 24 : 21} y={15 + i * 4} width="3" height="2.4" fill="#d9dee5" />
          ))}
          <rect x="19.5" y="37" width="9" height="7" rx="1.5" fill="#f2c64a" stroke="#8a5a06" strokeWidth="0.8" />
          <circle cx="24" cy="40.5" r="1.1" fill="#6b4504" />
        </>
      );
      break;
    case "release":
      body = (
        <>
          <defs>
            <linearGradient id={`${id}-page`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#d7e3f1" />
            </linearGradient>
            <linearGradient id={`${id}-arrow`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b8f0a7" />
              <stop offset="0.5" stopColor="#3fbf3f" />
              <stop offset="1" stopColor="#157a15" />
            </linearGradient>
          </defs>
          <path d="M10 5h19l9 9v29H10z" fill={u("page")} stroke="#6b829e" strokeWidth="1" strokeLinejoin="round" />
          <path d="M29 5v9h9" fill="#e8eff8" stroke="#6b829e" strokeWidth="1" strokeLinejoin="round" />
          <rect x="14" y="36" width="20" height="4" rx="1" fill="#cfcfcf" stroke="#8d8d8d" strokeWidth="0.6" />
          <rect x="14.4" y="36.4" width="12" height="3.2" rx="0.6" fill="#4fcf4f" />
          <path d="M20 12h8v9h5l-9 10-9-10h5z" fill={u("arrow")} stroke="#0f5e0f" strokeWidth="0.9" strokeLinejoin="round" />
        </>
      );
      break;
    case "footage":
      // a typed page gone yellow, with a strip of film and a stain
      body = (
        <>
          <defs>
            <linearGradient id={`${id}-old`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f3ead2" />
              <stop offset="1" stopColor="#d6c7a0" />
            </linearGradient>
          </defs>
          <path d="M10 5h20l8 8v30H10z" fill={u("old")} stroke="#7a6a48" strokeWidth="1" strokeLinejoin="round" />
          <path d="M30 5v8h8" fill="#e6dab8" stroke="#7a6a48" strokeWidth="1" strokeLinejoin="round" />
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1="14" y1={17 + i * 4.5} x2={i === 3 ? 25 : 32} y2={17 + i * 4.5} stroke="#4a3f2c" strokeWidth="1.1" strokeDasharray="2 1" />
          ))}
          <circle cx="31" cy="34" r="5" fill="#8e1b1b" opacity="0.28" />
          <rect x="5" y="30" width="22" height="11" fill="#141414" stroke="#000" strokeWidth="0.8" transform="rotate(-12 16 35)" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={6.5 + i * 5.3} y="31.2" width="2.4" height="1.8" fill="#d8d0b8" transform="rotate(-12 16 35)" />
          ))}
          <rect x="9" y="34" width="13" height="4" fill="#5a2a2a" opacity="0.9" transform="rotate(-12 16 35)" />
        </>
      );
      break;
    case "pictures":
      // a folder with a photo sticking out of it
      body = (
        <>
          <defs>
            <linearGradient id={`${id}-folder`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe28a" />
              <stop offset="1" stopColor="#e0a525" />
            </linearGradient>
          </defs>
          <path d="M4 12h14l3 3h23v25H4z" fill="#c98d14" stroke="#8a5a06" strokeWidth="1" strokeLinejoin="round" />
          <rect x="12" y="8" width="24" height="20" fill="#fff" stroke="#8d8d8d" strokeWidth="0.8" transform="rotate(-6 24 18)" />
          <rect x="14.5" y="10.5" width="19" height="13" fill="#1a0f14" transform="rotate(-6 24 18)" />
          <circle cx="24" cy="17" r="3.4" fill="#e7dcc3" transform="rotate(-6 24 18)" />
          <circle cx="24" cy="17" r="1.6" fill="#7e1414" transform="rotate(-6 24 18)" />
          <path d="M4 19h40l-2 21H6z" fill={u("folder")} stroke="#8a5a06" strokeWidth="1" strokeLinejoin="round" />
          <path d="M6 21h36" stroke="#fff" strokeOpacity="0.6" strokeWidth="1" />
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
