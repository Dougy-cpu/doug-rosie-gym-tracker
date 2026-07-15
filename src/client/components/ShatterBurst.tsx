import type { CSSProperties } from "react";

const surfaceFragments = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  angle: (index * 137.5 + 18) % 360,
  distance: 78 + (index % 8) * 16,
  width: 7 + (index % 5) * 4,
  height: 10 + ((index * 3) % 6) * 4,
  rotation: (index * 71) % 220 - 110,
  delay: (index % 8) * 12,
  gravity: 18 + (index % 6) * 7
}));

export function ShatterBurst({ active, intensity = "daily" }: { active: boolean; intensity?: string }) {
  return (
    <span
      className="hold-shatter-burst"
      aria-hidden="true"
      data-shatter-active={active ? "true" : "false"}
      data-shatter-intensity={intensity}
    >
      <span className="shatter-surface" />
      {surfaceFragments.map((shard) => (
        <i
          key={shard.id}
          style={
            {
              "--shard-angle": `${shard.angle}deg`,
              "--shard-distance": `${shard.distance}px`,
              "--shard-width": `${shard.width}px`,
              "--shard-height": `${shard.height}px`,
              "--shard-rotation": `${shard.rotation}deg`,
              "--shard-delay": `${shard.delay}ms`,
              "--shard-gravity": `${shard.gravity}px`
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
