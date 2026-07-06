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

  return (
    <div className={["progress-segments", className].filter(Boolean).join(" ")} aria-label={`${capped} of ${target} complete`}>
      {Array.from({ length: target }, (_, index) => {
        const complete = index < capped;
        const next = index === capped;

        return (
          <span className={complete ? "segment complete" : next ? "segment next" : "segment"} key={index}>
            <i />
          </span>
        );
      })}
    </div>
  );
}
