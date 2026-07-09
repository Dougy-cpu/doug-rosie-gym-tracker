import { Dumbbell, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createHoldGestureController, type HoldGestureController } from "../holdGesture";

interface HoldToLogTileProps {
  completed: boolean;
  disabled: boolean;
  rewardClass: string;
  rewardDurationMs: number;
  onComplete: () => Promise<void>;
  onHoldStart: () => void;
  onHoldCancel: () => void;
  onHoldPressurePulse: (milestone: HoldPressureMilestone) => void;
}

export const HOLD_TO_CONFIRM_MS = 3000;
type HoldTileClickEvent = Pick<React.MouseEvent<HTMLButtonElement>, "preventDefault" | "stopPropagation">;
export type HoldPressureMilestone = "pressure-build" | "unstable";
type HoldStage = "idle" | "initial-lock" | "pressure-build" | "cracking" | "unstable" | "final-warning";

const crackLines = [
  { left: 49, top: 24, rotate: -18, length: 40 },
  { left: 47, top: 34, rotate: 24, length: 34 },
  { left: 42, top: 44, rotate: -48, length: 32 },
  { left: 57, top: 46, rotate: 52, length: 42 },
  { left: 37, top: 57, rotate: 18, length: 30 },
  { left: 63, top: 58, rotate: -22, length: 34 },
  { left: 51, top: 68, rotate: 76, length: 38 }
] as const;

const shardFragments = Array.from({ length: 64 }, (_, index) => ({
  id: index,
  angle: (index * 137.5) % 360,
  distance: 72 + (index % 8) * 15,
  size: 5 + (index % 5) * 3,
  delay: (index % 9) * 12
}));

export function cancelHoldTileClickActivation(event: HoldTileClickEvent, stopHolding: () => void) {
  event.preventDefault();
  event.stopPropagation();
  stopHolding();
}

export function HoldToLogTile({
  completed,
  disabled,
  rewardClass,
  rewardDurationMs,
  onComplete,
  onHoldStart,
  onHoldCancel,
  onHoldPressurePulse
}: HoldToLogTileProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [busy, setBusy] = useState(false);
  const controllerRef = useRef<HoldGestureController | null>(null);
  const milestoneRef = useRef<Record<HoldPressureMilestone, boolean>>({
    "pressure-build": false,
    unstable: false
  });

  useEffect(() => {
    return () => {
      controllerRef.current?.cleanup();
    };
  }, []);

  const resetMilestones = () => {
    milestoneRef.current = {
      "pressure-build": false,
      unstable: false
    };
  };

  const handleProgress = (nextProgress: number) => {
    setProgress(nextProgress);

    if (nextProgress >= 0.25 && !milestoneRef.current["pressure-build"]) {
      milestoneRef.current["pressure-build"] = true;
      onHoldPressurePulse("pressure-build");
    }

    if (nextProgress >= 0.67 && !milestoneRef.current.unstable) {
      milestoneRef.current.unstable = true;
      onHoldPressurePulse("unstable");
    }
  };

  const start = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || completed || busy) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    resetMilestones();
    setHolding(true);
    onHoldStart();
    controllerRef.current = createHoldGestureController({
      durationMs: HOLD_TO_CONFIRM_MS,
      getNow: () => performance.now(),
      onProgress: handleProgress,
      requestFrame: (callback) => window.requestAnimationFrame(callback),
      cancelFrame: (frameId) => window.cancelAnimationFrame(frameId),
      onComplete: async () => {
        setBusy(true);
        try {
          await onComplete();
        } finally {
          setBusy(false);
          setHolding(false);
          resetMilestones();
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
      resetMilestones();
      onHoldCancel();
    }
  };

  const holdStage = getHoldStage(progress, holding);
  const label = completed ? "Session locked" : busy ? "Banking..." : getHoldStageLabel(holdStage);
  const shattering = rewardClass !== "reward-none";

  return (
    <button
      className={[
        "hold-tile",
        completed ? "completed" : "",
        holding ? "holding" : "",
        `hold-stage-${holdStage}`,
        shattering ? "shattering" : "",
        rewardClass
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      disabled={disabled || completed || busy}
      data-hold-stage={holdStage}
      style={
        {
          "--reward-duration": `${rewardDurationMs}ms`,
          "--hold-progress-ratio": progress
        } as React.CSSProperties
      }
      onClick={(event) => cancelHoldTileClickActivation(event, stop)}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onLostPointerCapture={stop}
      onBlur={stop}
    >
      <span className="hold-progress" style={{ transform: `scaleX(${completed ? 1 : progress})` }} />
      <span className="hold-ring" style={{ "--hold-progress": `${Math.round((completed ? 1 : progress) * 100)}%` } as React.CSSProperties} />
      <CrackOverlay progress={progress} active={holding || shattering} />
      <SparkLeak progress={progress} active={holding || shattering} />
      <ShatterBurst active={shattering} />
      <span className="hold-shockwave" aria-hidden="true" />
      <span className="hold-icon">{completed ? <Check /> : <Dumbbell />}</span>
      <span className="hold-label">{label}</span>
      <span className="hold-caption">{completed ? "Today is already banked." : "Hold 3 seconds"}</span>
    </button>
  );
}

export function getHoldStage(progress: number, holding: boolean): HoldStage {
  if (!holding) {
    return "idle";
  }

  if (progress >= 0.8) {
    return "final-warning";
  }

  if (progress >= 0.54) {
    return "unstable";
  }

  if (progress >= 0.3) {
    return "cracking";
  }

  if (progress >= 0.1) {
    return "pressure-build";
  }

  return "initial-lock";
}

export function getHoldStageLabel(stage: HoldStage): string {
  if (stage === "initial-lock") {
    return "Locking...";
  }

  if (stage === "pressure-build") {
    return "Locking...";
  }

  if (stage === "cracking") {
    return "Pressure building";
  }

  if (stage === "unstable") {
    return "Do not let go";
  }

  if (stage === "final-warning") {
    return "Rupture imminent";
  }

  return "Hold to bank today";
}

function CrackOverlay({ active, progress }: { active: boolean; progress: number }) {
  return (
    <span
      className="hold-crack-overlay"
      aria-hidden="true"
      style={{ "--crack-intensity": active ? Math.min(1, progress * 1.18) : 0 } as React.CSSProperties}
    >
      {crackLines.map((line, index) => (
        <i
          key={index}
          style={
            {
              "--crack-left": `${line.left}%`,
              "--crack-top": `${line.top}%`,
              "--crack-rotate": `${line.rotate}deg`,
              "--crack-length": `${line.length}px`,
              "--crack-delay": `${index * 45}ms`
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

function SparkLeak({ active, progress }: { active: boolean; progress: number }) {
  return (
    <span
      className="hold-spark-leak"
      aria-hidden="true"
      style={{ "--spark-intensity": active ? Math.min(1, progress * 1.35) : 0 } as React.CSSProperties}
    >
      {Array.from({ length: 18 }, (_, index) => (
        <i key={index} style={{ "--spark-index": index } as React.CSSProperties} />
      ))}
    </span>
  );
}

function ShatterBurst({ active }: { active: boolean }) {
  return (
    <span className="hold-shatter-burst" aria-hidden="true" data-shatter-active={active ? "true" : "false"}>
      {shardFragments.map((shard) => (
        <i
          key={shard.id}
          style={
            {
              "--shard-angle": `${shard.angle}deg`,
              "--shard-distance": `${shard.distance}px`,
              "--shard-size": `${shard.size}px`,
              "--shard-delay": `${shard.delay}ms`
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}
