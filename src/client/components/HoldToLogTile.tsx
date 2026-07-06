import { Dumbbell, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createHoldGestureController, type HoldGestureController } from "../holdGesture";

interface HoldToLogTileProps {
  completed: boolean;
  disabled: boolean;
  onComplete: () => Promise<void>;
}

export const HOLD_TO_LOG_DURATION_MS = 1500;

export function HoldToLogTile({ completed, disabled, onComplete }: HoldToLogTileProps) {
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const controllerRef = useRef<HoldGestureController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.cleanup();
    };
  }, []);

  const start = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || completed || busy) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    controllerRef.current = createHoldGestureController({
      durationMs: HOLD_TO_LOG_DURATION_MS,
      getNow: () => performance.now(),
      onProgress: setProgress,
      requestFrame: (callback) => window.requestAnimationFrame(callback),
      cancelFrame: (frameId) => window.cancelAnimationFrame(frameId),
      onComplete: async () => {
        setBusy(true);
        try {
          await onComplete();
        } finally {
          setBusy(false);
        }
      }
    });
    controllerRef.current.start();
  };

  const stop = () => {
    controllerRef.current?.stop();
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
