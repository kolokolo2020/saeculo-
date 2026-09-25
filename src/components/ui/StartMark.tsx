// The mark inside the start orb and on the boot screen: four equalizer
// bars — saeculo's own logo rather than anyone else's four-pane flag.
export default function StartMark({ size = 22, className }: { size?: number; className?: string }) {
  const bars = [
    { x: 2, h: 9 },
    { x: 7.5, h: 16 },
    { x: 13, h: 12 },
    { x: 18.5, h: 19 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={21.5 - b.h}
          width="4"
          height={b.h}
          rx="1.5"
          fill="#fff"
          fillOpacity={0.95 - i * 0.06}
        />
      ))}
    </svg>
  );
}
