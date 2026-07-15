import { LockKeyhole } from "lucide-react";

export function ProgressSegments({
  value,
  target,
  className = ""
}: {
  value: number;
  target: number;
  className?: string;
}) {
  const capped = Math.min(Math.max(value, 0), target);
  const targetArmed = capped === target - 1;

  return (
    <div
      className={["progress-segments", "mechanical-locks", targetArmed ? "target-armed" : "", className]
        .filter(Boolean)
        .join(" ")}
      aria-label={`${capped} of ${target} complete`}
    >
      {Array.from({ length: target }, (_, index) => {
        const complete = index < capped;
        const next = index === capped;
        const state = complete ? "complete" : next ? "next" : "idle";

        return (
          <span
            className={["segment", state, next && targetArmed ? "target" : ""].filter(Boolean).join(" ")}
            data-lock-index={index + 1}
            data-lock-state={state}
            key={index}
            aria-hidden="true"
          >
            <i className="segment-core" />
            <LockKeyhole />
            <b>{String(index + 1).padStart(2, "0")}</b>
          </span>
        );
      })}
    </div>
  );
}
