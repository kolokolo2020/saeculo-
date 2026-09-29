"use client";

import { useId, useState } from "react";
import {
  FLYER_SIZE,
  NightRadioFlyer,
  POSTER_SIZE,
  TapeSwapFlyer,
  TapesPoster,
  WarehouseFlyer,
} from "@/components/room/posters";
import Glyph from "@/components/ui/Glyph";

interface Picture {
  file: string;
  /** What a screen reader hears, and the viewer's caption. */
  alt: string;
  caption: string;
  taken: string;
  size: { w: number; h: number };
  Art: (props: { dots: string }) => React.ReactNode;
}

const PICTURES: Picture[] = [
  {
    file: "poster.jpg",
    alt: "Film poster: THE SAECULO TAPES. A wide staring eye over two drips of blood. Nobody sleeps on tape. In color, 1987, rated X.",
    caption: "Taped up next to the window in the room. The film was never released.",
    taken: "10/31/1987",
    size: POSTER_SIZE,
    Art: TapesPoster,
  },
  {
    file: "flyer_warehouse.jpg",
    alt: "Photocopied flyer: WAREHOUSE. Saturday, 3 am. saeculo live, plus a tape swap. No phones, no names.",
    caption: "Somebody kept the address. It isn't on here.",
    taken: "3/03/2003",
    size: FLYER_SIZE,
    Art: WarehouseFlyer,
  },
  {
    file: "flyer_tapeswap.jpg",
    alt: "Black flyer with a cassette: TAPE SWAP. The basement, under the laundromat. Bring blanks, leave copies.",
    caption: "Everyone left with more tapes than they brought.",
    taken: "6/13/2006",
    size: FLYER_SIZE,
    Art: TapeSwapFlyer,
  },
  {
    file: "flyer_nightradio.jpg",
    alt: "Pink flyer with a radio dial: NIGHT RADIO. 3 am till the tape runs out. No names, no ads. Keep turning past the end.",
    caption: "Handed out at the swap. The frequency was never printed.",
    taken: "??/??/????",
    size: FLYER_SIZE,
    Art: NightRadioFlyer,
  },
];

function Print({ picture, className, label }: { picture: Picture; className?: string; label?: string }) {
  const raw = useId();
  const dots = `pic-dots-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { w, h } = picture.size;
  const { Art } = picture;
  return (
    <svg
      viewBox={`-16 -16 ${w + 32} ${h + 32}`}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <pattern id={dots} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx="4.5" cy="4.5" r="1.7" fill="#000" />
        </pattern>
      </defs>
      <Art dots={dots} />
    </svg>
  );
}

// Pictures: the Room's film poster and show flyers, in a Photo Gallery–style
// folder. Click a thumbnail to view it; the arrow keys step through.
export default function PicturesApp() {
  const [open, setOpen] = useState<number | null>(null);

  if (open !== null) {
    const pic = PICTURES[open];
    const step = (d: number) => setOpen((open + d + PICTURES.length) % PICTURES.length);
    return (
      <div
        className="flex h-full flex-col bg-[#1c1d22] text-white"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          else if (e.key === "ArrowLeft") step(-1);
          else if (e.key === "Escape") setOpen(null);
        }}
      >
        <div className="aero-toolbar flex h-9 shrink-0 items-center gap-2 px-2 text-ink">
          <button onClick={() => setOpen(null)} className="aero-btn px-3 py-1 text-[12px]" autoFocus>
            ‹ Pictures
          </button>
          <span className="truncate text-[12px] text-mute">
            {pic.file} · Date taken: {pic.taken}
          </span>
        </div>
        <div className="grid min-h-0 flex-1 place-items-center p-3 [background:radial-gradient(ellipse_at_50%_40%,#2c2d34,#101014)]">
          <Print picture={pic} label={pic.alt} className="h-full max-h-full w-auto max-w-full drop-shadow-[0_8px_18px_rgba(0,0,0,0.7)]" />
        </div>
        <div className="flex shrink-0 items-center gap-2 border-t border-white/10 px-3 py-2">
          <button onClick={() => step(-1)} aria-label="Previous picture" className="aero-btn-dark grid h-7 w-8 place-items-center">
            <Glyph name="prev" size={11} />
          </button>
          <button onClick={() => step(1)} aria-label="Next picture" className="aero-btn-dark grid h-7 w-8 place-items-center">
            <Glyph name="next" size={11} />
          </button>
          <p className="min-w-0 flex-1 text-[12px] leading-snug text-white/80">{pic.caption}</p>
          <span className="text-[11px] text-white/60 max-sm:hidden">
            {open + 1} of {PICTURES.length}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col text-ink">
      <div className="aero-toolbar flex h-9 shrink-0 items-center gap-2 px-2">
        <span className="text-[12px] text-mute">C:\Users\saeculo\Pictures\the room</span>
      </div>
      <ul aria-label="Pictures" className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-2 overflow-y-auto bg-white p-3">
        {PICTURES.map((pic, i) => (
          <li key={pic.file}>
            <button
              onClick={() => setOpen(i)}
              aria-label={`Open ${pic.file}`}
              className="flex w-full flex-col items-center gap-1 rounded-[3px] border border-transparent p-2 hover:border-[#b8d6fb] hover:bg-[#eef5fd] focus-visible:border-[#7da2ce] focus-visible:bg-[#dcebfc] focus-visible:outline-none"
            >
              <span className="grid h-[118px] w-full place-items-center">
                <Print picture={pic} className="h-full w-auto drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]" />
              </span>
              <span className="w-full truncate text-center text-[12px]">{pic.file}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="shrink-0 border-t border-[#d4dbe4] bg-[#f1f5fa] px-3 py-1 text-[11px] text-mute">
        {PICTURES.length} items · click one to view it
      </div>
    </div>
  );
}
