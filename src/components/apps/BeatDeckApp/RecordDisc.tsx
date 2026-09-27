import { CERT_COLOR } from "./look";

// A little vinyl for each certification: black grooves, a label in the
// level's colour, and for Gold and Platinum a metallic sheen on the disc.
export default function RecordDisc({ level, size = 28, dim = false }: { level: number; size?: number; dim?: boolean }) {
  const c = CERT_COLOR[level];
  const metal = level >= 4;
  return (
    <span
      aria-hidden
      className={`relative inline-block shrink-0 rounded-full ${dim ? "opacity-35 grayscale" : ""}`}
      style={{
        width: size,
        height: size,
        background: metal
          ? `conic-gradient(from 40deg, ${c}, #fff8, ${c}, #0006, ${c}, #fff8, ${c})`
          : "repeating-radial-gradient(circle, #121417 0 1px, #23262b 1px 2px)",
        boxShadow: `0 1px 3px rgba(0,0,0,0.6)${dim ? "" : `, 0 0 8px ${c}55`}`,
      }}
    >
      <span className="absolute inset-[31%] rounded-full" style={{ background: metal ? "#15181d" : c }} />
      <span className="absolute inset-[46%] rounded-full bg-black/80" />
    </span>
  );
}
