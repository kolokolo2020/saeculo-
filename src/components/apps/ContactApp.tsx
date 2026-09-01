import { PROFILE } from "@/data/profile";

export default function ContactApp() {
  return (
    <div className="font-body flex h-full flex-col items-center justify-center gap-4 text-center">
      <p className="font-readout text-sm text-mute uppercase">booking / collabs / licensing</p>
      <a
        href={`mailto:${PROFILE.bookingEmail}`}
        className="text-signal text-2xl font-semibold hover:underline"
      >
        {PROFILE.bookingEmail}
      </a>
      <p className="text-sm text-ink/60">Usually replies within a day or two.</p>
    </div>
  );
}
