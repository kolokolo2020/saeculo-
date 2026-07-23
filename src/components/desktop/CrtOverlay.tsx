export default function CrtOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9500]"
      style={{
        background:
          "repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 3px), radial-gradient(ellipse at center, transparent 62%, rgba(0,0,0,0.28) 100%)",
      }}
    />
  );
}
