"use client";

import { useRef } from "react";

// A rotary knob: drag up/down (or scroll, or use the arrow keys) to turn it.
// 270° of travel with a lit arc showing the value, like a hardware groovebox.
export default function Knob({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  size = 44,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  size?: number;
}) {
  const drag = useRef<{ y: number; v: number } | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const frac = (value - min) / (max - min);
  const angle = -135 + frac * 270;
  const r = size / 2 - 4;
  const arc = (a0: number, a1: number) => {
    const p = (a: number) => {
      const rad = ((a - 90) * Math.PI) / 180;
      return `${size / 2 + r * Math.cos(rad)} ${size / 2 + r * Math.sin(rad)}`;
    };
    return `M ${p(a0)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p(a1)}`;
  };
  const text = format ? format(value) : String(value);

  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={text}
        className="relative cursor-ns-resize touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#7fe0ff]/70"
        style={{ width: size, height: size }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, v: value };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const range = max - min;
          const fine = e.shiftKey ? 0.25 : 1;
          onChange(clamp(drag.current.v + ((drag.current.y - e.clientY) / 140) * range * fine));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onDoubleClick={() => onChange(clamp(min + (max - min) / 2))}
        onWheel={(e) => onChange(clamp(value + (e.deltaY < 0 ? step : -step) * (e.shiftKey ? 1 : Math.max(1, Math.round((max - min) / 50)))))}
        onKeyDown={(e) => {
          const big = Math.max(step, (max - min) / 10);
          const map: Record<string, number> = {
            ArrowUp: value + step,
            ArrowRight: value + step,
            ArrowDown: value - step,
            ArrowLeft: value - step,
            PageUp: value + big,
            PageDown: value - big,
            Home: min,
            End: max,
          };
          if (e.key in map) {
            e.preventDefault();
            onChange(clamp(map[e.key]));
          }
        }}
      >
        <svg width={size} height={size} className="absolute inset-0" aria-hidden>
          <path d={arc(-135, 135)} stroke="#0a0f16" strokeWidth={3.5} fill="none" strokeLinecap="round" />
          {frac > 0.004 && (
            <path
              d={arc(-135, angle)}
              stroke="#7fe0ff"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              style={{ filter: "drop-shadow(0 0 3px rgba(127,224,255,0.9))" }}
            />
          )}
        </svg>
        {/* the cap: glossy black with a white pointer */}
        <div
          className="absolute rounded-full border border-black"
          style={{
            inset: 7,
            background: "radial-gradient(circle at 50% 30%, #5a6474 0%, #262d37 45%, #0b0f15 100%)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.35)",
            transform: `rotate(${angle}deg)`,
          }}
        >
          <span className="absolute top-[3px] left-1/2 h-[30%] w-[2px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_3px_#fff]" />
        </div>
      </div>
      <span className="text-[10px] tracking-wide text-[#8fa3bd] uppercase">{label}</span>
      <span className="font-mono text-[11px] leading-none text-[#cfe6ff]">{text}</span>
    </div>
  );
}
