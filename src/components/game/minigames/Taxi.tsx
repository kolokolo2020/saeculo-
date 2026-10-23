"use client";

import { TAXI, TAXI_FARE } from "../career";
import type { Place } from "../sfx";
import Frame, { miniBtn } from "./Frame";

// Getting about: a cab called from your phone (or your own scooter, once
// you've got one), to anywhere outside you've already been.

export default function Taxi({ cash, scooter, here, visited, onGo, onClose }: { cash: number; scooter: boolean; here: Place; visited: Place[]; onGo: (place: Place) => void; onClose: () => void }) {
  const fare = scooter ? 0 : TAXI_FARE;
  const spots = TAXI.filter((t) => visited.includes(t.place));
  return (
    <Frame title={scooter ? "Your scooter" : "A cab"} sub={scooter ? "free, and quicker" : `$${TAXI_FARE} anywhere`} onClose={onClose} testid="taxi">
      <ul className="flex flex-col gap-1.5">
        {spots.map((t) => (
          <li key={t.place} className="flex items-center gap-3">
            <span className="min-w-0 flex-1">{t.name}</span>
            <button className={miniBtn} disabled={t.place === here || cash < fare} onClick={() => onGo(t.place)} data-testid={`taxi-${t.place}`} aria-label={t.place === here ? `${t.name}: you're here` : `Go to ${t.name}`}>
              {t.place === here ? "here" : fare ? `$${fare}` : "go"}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[16px] text-[#8a8170]">{scooter ? "It drops you outside. Lock it up." : "It drops you outside. Places you haven't been yet aren't on the list."}</p>
    </Frame>
  );
}
