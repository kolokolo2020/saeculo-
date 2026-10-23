import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not found — saeculo",
  robots: { index: false },
};

// An unknown address (or a beat that isn't in the folder any more): one small
// window on the desktop's paper, with the way back.
export default function NotFound() {
  return (
    <main className="desktop relative grid h-full place-items-center p-4">
      <div className="wallpaper" aria-hidden />
      <section aria-labelledby="nf-title" className="panel relative w-full max-w-[340px] overflow-hidden">
        <h1 id="nf-title" className="win-title">
          Not found
          <span className="win-stripes" aria-hidden />
        </h1>
        <div className="flex flex-col gap-4 p-5">
          <p className="text-[14px] leading-relaxed text-ink-2">There&rsquo;s nothing at this address. The beats are all on the desktop.</p>
          <Link href="/" className="btn btn-primary self-end">
            Back to the desktop
          </Link>
        </div>
      </section>
    </main>
  );
}
