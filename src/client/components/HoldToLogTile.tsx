import { Dumbbell, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface HoldToLogTileProps {
  completed: boolean;
  disabled: boolean;
  onComplete: () => Promise<void>;
}

const holdDurationMs = 1500;

export function HoldToLogTile({ completed, disabled, onComplete }: HoldToLogTileProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [busy, setBusy] = useState(false);
  const frameRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  const cancelFrame = () => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const start = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || completed || busy) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    startedAtRef.current = performance.now();
    setHolding(true);
    tick();
  };

  const stop = () => {
    if (!holding) {
      return;
    }

    cancelFrame();
    setHolding(false);
    setProgress(0);
  };

  const tick = () => {
    cancelFrame();
    frameRef.current = window.requestAnimationFrame(async () => {
      const elapsed = performance.now() - startedAtRef.current;
      const nextProgress = Math.min(1, elapsed / holdDurationMs);
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        cancelFrame();
        setHolding(false);
        setBusy(true);
        try {
          await onComplete();
        } finally {
          setBusy(false);
          setProgress(0);
        }
        return;
      }

      tick();
    });
  };

  const label = completed ? "Workout logged" : busy ? "Logging..." : "Hold to log workout";

  return (
    <button
      className={completed ? "hold-tile completed" : "hold-tile"}
      type="button"
      disabled={disabled || completed || busy}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
    >
      <span className="hold-progress" style={{ transform: `scaleX(${completed ? 1 : progress})` }} />
      <span className="hold-icon">{completed ? <Check /> : <Dumbbell />}</span>
      <span className="hold-label">{label}</span>
      <span className="hold-caption">{completed ? "Today is already banked." : "Hold 1.5 seconds"}</span>
    </button>
  );
}
