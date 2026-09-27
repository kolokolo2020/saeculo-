"use client";

import { useEffect } from "react";
import AppIcon from "@/components/ui/AppIcon";
import { useWindowStore } from "@/components/window-manager/windowStore";
import type { WindowKind } from "@/lib/types";

const MENU_W = 210;
const MENU_H = 196;

function Item({ kind, label, onClick }: { kind?: WindowKind; label: string; onClick: () => void }) {
  return (
    <li>
      <button
        role="menuitem"
        onClick={onClick}
        className="flex w-full items-center gap-2 rounded-[3px] border border-transparent px-1.5 py-1 text-left text-[12.5px] hover:border-[#aecff7] hover:bg-gradient-to-b hover:from-[#f2f8ff] hover:to-[#dcebfc] focus-visible:border-[#aecff7] focus-visible:bg-[#e6f1fd] focus-visible:outline-none"
      >
        <span className="grid w-5 place-items-center">{kind && <AppIcon kind={kind} size={16} />}</span>
        {label}
      </button>
    </li>
  );
}

// The right-click menu on the desktop background.
export default function DesktopContextMenu({
  x,
  y,
  onClose,
  onRefresh,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const openWindow = useWindowStore((s) => s.openWindow);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // keep the whole menu on screen near the right and bottom edges
  const left = Math.min(x, window.innerWidth - MENU_W - 4);
  const top = Math.min(y, window.innerHeight - 40 - MENU_H - 4);

  const open = (kind: WindowKind) => {
    openWindow(kind);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[9300]"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
        aria-hidden
      />
      <ul
        role="menu"
        aria-label="Desktop menu"
        style={{ left, top, width: MENU_W }}
        className="aero-open fixed z-[9400] rounded-[4px] border border-[#979797] bg-[linear-gradient(to_right,#f1f1f1_28px,#e3e3e3_28px,#e3e3e3_29px,#ffffff_29px)] p-[3px] text-ink shadow-[2px_3px_10px_rgba(0,0,0,0.35)]"
      >
        <Item kind="player" label="Open Media Player" onClick={() => open("player")} />
        <Item kind="beatmaker" label="Open Beat Maker" onClick={() => open("beatmaker")} />
        <Item kind="beatdeck" label="Play Beat Deck" onClick={() => open("beatdeck")} />
        <li className="my-[3px] ml-8 border-t border-[#d7d7d7]" aria-hidden />
        <Item
          label="Refresh"
          onClick={() => {
            onRefresh();
            onClose();
          }}
        />
        <li className="my-[3px] ml-8 border-t border-[#d7d7d7]" aria-hidden />
        <Item kind="personalize" label="Personalize" onClick={() => open("personalize")} />
      </ul>
    </>
  );
}
