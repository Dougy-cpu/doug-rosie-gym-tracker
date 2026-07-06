import { Dumbbell, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createHoldGestureController, type HoldGestureController } from "../holdGesture";

interface HoldToLogTileProps {
  completed: boolean;
  disabled: boolean;
  rewardClass: string;
  onComplete: () => Promise<void>;
  onHoldStart: () => void;
  onHoldCancel: () => void;
}

export const HOLD_TO_LOG_DURATION_MS = 700;

export function HoldToLogTile({
  completed,
  disabled,
  rewardClass,
  onComplete,
  onHoldStart,
  onHoldCancel
}: HoldToLogTileProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
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
    setHolding(true);
    onHoldStart();
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
          setHolding(false);
        }
      }
    });
    controllerRef.current.start();
  };

  const stop = () => {
    const wasHolding = controllerRef.current?.isHolding() ?? false;
    controllerRef.current?.stop();
    if (wasHolding) {
      setHolding(false);
      onHoldCancel();
    }
  };

  const label = completed ? "Session locked" : busy ? "Banking..." : holding ? "Charging..." : "Hold to bank today";

  return (
    <button
      className={[
        "hold-tile",
        completed ? "completed" : "",
        holding ? "holding" : "",
        rewardClass
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      disabled={disabled || completed || busy}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
    >
      <span className="hold-progress" style={{ transform: `scaleX(${completed ? 1 : progress})` }} />
      <span className="hold-ring" style={{ "--hold-progress": `${Math.round((completed ? 1 : progress) * 100)}%` } as React.CSSProperties} />
      <span className="hold-shockwave" aria-hidden="true" />
      <span className="hold-icon">{completed ? <Check /> : <Dumbbell />}</span>
      <span className="hold-label">{label}</span>
      <span className="hold-caption">{completed ? "Today is already banked." : "Hold 0.7 seconds"}</span>
    </button>
  );
}
