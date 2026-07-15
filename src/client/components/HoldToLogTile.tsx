import { Check, Dumbbell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  createHoldGestureController,
  HOLD_TO_CONFIRM_MS,
  type HoldGestureController,
  type HoldHapticMilestone
} from "../holdGesture";
import { getOriginFromElement, type RewardExplosionOrigin } from "../rewardExplosion";
import { CrackOverlay, SparkLeak } from "./CrackOverlay";
import { ShatterBurst } from "./ShatterBurst";

export { HOLD_TO_CONFIRM_MS } from "../holdGesture";

interface HoldToLogTileProps {
  completed: boolean;
  disabled: boolean;
  rewardClass: string;
  rewardDurationMs: number;
  idleLabel?: string;
  onComplete: () => Promise<void>;
  onHoldStart: () => void;
  onHoldCancel: () => void;
  onHoldPressurePulse: (milestone: HoldHapticMilestone) => void;
  onRewardOriginChange: (origin: RewardExplosionOrigin | null) => void;
}

type HoldTileClickEvent = Pick<React.MouseEvent<HTMLButtonElement>, "preventDefault" | "stopPropagation">;
export type HoldStage = "idle" | "initial-lock" | "pressure-build" | "cracking" | "unstable" | "final-warning";

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
  idleLabel = "Bank today's session",
  onComplete,
  onHoldStart,
  onHoldCancel,
  onHoldPressurePulse,
  onRewardOriginChange
}: HoldToLogTileProps) {
  const [holding, setHolding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [holdStage, setHoldStage] = useState<HoldStage>("idle");
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const controllerRef = useRef<HoldGestureController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.cleanup();
    };
  }, []);

  useEffect(() => {
    const shell = buttonRef.current?.closest(".app-shell");
    const pressureClasses = ["hold-shell-cracking", "hold-shell-unstable", "hold-shell-critical"];
    shell?.classList.remove(...pressureClasses);
    if (holding && holdStage === "cracking") shell?.classList.add("hold-shell-cracking");
    if (holding && holdStage === "unstable") shell?.classList.add("hold-shell-unstable");
    if (holding && holdStage === "final-warning") shell?.classList.add("hold-shell-critical");

    return () => shell?.classList.remove(...pressureClasses);
  }, [holdStage, holding]);

  const handleProgress = (nextProgress: number) => {
    const tile = buttonRef.current;
    tile?.style.setProperty("--hold-progress-ratio", String(nextProgress));
    tile?.style.setProperty("--hold-progress-percent", `${Math.round(nextProgress * 100)}%`);
    const nextStage = getHoldStage(nextProgress, nextProgress > 0);
    setHoldStage((current) => (current === nextStage ? current : nextStage));
  };

  const start = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || completed || busy) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    onRewardOriginChange(getOriginFromElement(event.currentTarget));
    event.currentTarget.style.setProperty("--hold-progress-ratio", "0");
    event.currentTarget.style.setProperty("--hold-progress-percent", "0%");
    setHoldStage("initial-lock");
    setHolding(true);
    onHoldStart();
    controllerRef.current = createHoldGestureController({
      durationMs: HOLD_TO_CONFIRM_MS,
      getNow: () => performance.now(),
      onProgress: handleProgress,
      onMilestone: onHoldPressurePulse,
      requestFrame: (callback) => window.requestAnimationFrame(callback),
      cancelFrame: (frameId) => window.cancelAnimationFrame(frameId),
      onComplete: async () => {
        setBusy(true);
        try {
          await onComplete();
        } finally {
          setBusy(false);
          setHolding(false);
          setHoldStage("idle");
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
      setHoldStage("idle");
      onHoldCancel();
    }
  };

  const shattering = rewardClass !== "reward-none";
  const label = busy ? "Banking..." : getHoldStageLabel(holdStage, idleLabel);
  const shatterIntensity = getShatterIntensity(rewardClass);

  return (
    <button
      ref={buttonRef}
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
          "--hold-progress-ratio": 0,
          "--hold-progress-percent": "0%"
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
      <span className="hold-progress" />
      <span className="hold-ring" />
      <span className="hold-pressure-vignette" aria-hidden="true" />
      <CrackOverlay active={holding || shattering} />
      <SparkLeak active={holding || shattering} />
      <ShatterBurst active={shattering} intensity={shatterIntensity} />
      <span className="hold-shockwave" aria-hidden="true" />

      {!completed ? (
        <span className="hold-face">
          <span className="hold-icon"><Dumbbell /></span>
          <span className="hold-label">{label}</span>
          <span className="hold-caption">Hold 3 seconds to rupture</span>
        </span>
      ) : (
        <span className="hold-completed-lock">
          <span className="hold-icon"><Check /></span>
          <span className="hold-label">Session banked</span>
          <span className="hold-caption">Today is locked</span>
        </span>
      )}
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

  if (progress >= 0.55) {
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

export function getHoldStageLabel(stage: HoldStage, idleLabel = "Bank today's session"): string {
  if (stage === "initial-lock" || stage === "pressure-build") {
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

  return idleLabel;
}

function getShatterIntensity(rewardClass: string): string {
  if (rewardClass.includes("complete")) return "weekly";
  if (rewardClass.includes("first")) return "first";
  if (rewardClass.includes("pressure")) return "target";
  if (rewardClass.includes("momentum")) return "momentum";
  return "daily";
}
