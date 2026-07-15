interface HoldGestureOptions {
  durationMs: number;
  getNow: () => number;
  onProgress: (progress: number) => void;
  onComplete: () => Promise<void>;
  onMilestone?: (milestone: HoldHapticMilestone) => void;
  requestFrame: (callback: () => void | Promise<void>) => number;
  cancelFrame: (frameId: number) => void;
}

export const HOLD_TO_CONFIRM_MS = 3000;

export type HoldHapticMilestone = "600ms" | "1200ms" | "1800ms" | "2400ms";

export const holdHapticMilestones: Array<{ progress: number; milestone: HoldHapticMilestone; pattern: number | number[] }> = [
  { progress: 0.2, milestone: "600ms", pattern: 12 },
  { progress: 0.4, milestone: "1200ms", pattern: 18 },
  { progress: 0.6, milestone: "1800ms", pattern: 28 },
  { progress: 0.8, milestone: "2400ms", pattern: [35, 20, 45] }
];

let activeHoldPointerId: number | null = null;
let activeHoldGuardCleanup: (() => void) | null = null;

export function beginHoldInteractionGuard(pointerId: number): void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  activeHoldGuardCleanup?.();
  activeHoldPointerId = pointerId;

  const root = document.documentElement;
  const body = document.body;
  const clearSelection = () => window.getSelection()?.removeAllRanges();
  const blockNativeHoldAction = (event: Event) => {
    event.preventDefault();
    clearSelection();
  };
  const release = (event: PointerEvent) => endHoldInteractionGuard(event.pointerId);
  const releaseAll = () => endHoldInteractionGuard();
  const releaseWhenHidden = () => {
    if (document.hidden) {
      endHoldInteractionGuard();
    }
  };

  root.classList.add("hold-interaction-active");
  body?.classList.add("hold-interaction-active");
  clearSelection();
  document.addEventListener("selectstart", blockNativeHoldAction, true);
  document.addEventListener("contextmenu", blockNativeHoldAction, true);
  document.addEventListener("dragstart", blockNativeHoldAction, true);
  document.addEventListener("pointerup", release, true);
  document.addEventListener("pointercancel", release, true);
  document.addEventListener("visibilitychange", releaseWhenHidden, true);
  window.addEventListener("blur", releaseAll, true);

  activeHoldGuardCleanup = () => {
    root.classList.remove("hold-interaction-active");
    body?.classList.remove("hold-interaction-active");
    document.removeEventListener("selectstart", blockNativeHoldAction, true);
    document.removeEventListener("contextmenu", blockNativeHoldAction, true);
    document.removeEventListener("dragstart", blockNativeHoldAction, true);
    document.removeEventListener("pointerup", release, true);
    document.removeEventListener("pointercancel", release, true);
    document.removeEventListener("visibilitychange", releaseWhenHidden, true);
    window.removeEventListener("blur", releaseAll, true);
    clearSelection();
  };
}

export function endHoldInteractionGuard(pointerId?: number): void {
  if (pointerId !== undefined && activeHoldPointerId !== pointerId) {
    return;
  }

  activeHoldGuardCleanup?.();
  activeHoldGuardCleanup = null;
  activeHoldPointerId = null;
}

export function getHoldHapticPattern(milestone: HoldHapticMilestone): number | number[] {
  return holdHapticMilestones.find((entry) => entry.milestone === milestone)?.pattern ?? 12;
}

export interface HoldGestureController {
  start: () => void;
  stop: () => void;
  cleanup: () => void;
  isHolding: () => boolean;
}

export function createHoldGestureController({
  durationMs,
  getNow,
  onProgress,
  onComplete,
  onMilestone,
  requestFrame,
  cancelFrame
}: HoldGestureOptions): HoldGestureController {
  let frameId: number | null = null;
  let startedAt = 0;
  let holding = false;
  let completing = false;
  const firedMilestones = new Set<HoldHapticMilestone>();

  const cancelCurrentFrame = () => {
    if (frameId !== null) {
      cancelFrame(frameId);
      frameId = null;
    }
  };

  const tick = async () => {
    if (!holding || completing) {
      return;
    }

    const progress = Math.min(1, (getNow() - startedAt) / durationMs);
    onProgress(progress);
    for (const entry of holdHapticMilestones) {
      if (progress >= entry.progress && !firedMilestones.has(entry.milestone)) {
        firedMilestones.add(entry.milestone);
        onMilestone?.(entry.milestone);
      }
    }

    if (progress >= 1) {
      holding = false;
      completing = true;
      cancelCurrentFrame();

      try {
        await onComplete();
      } finally {
        completing = false;
        onProgress(0);
      }
      return;
    }

    frameId = requestFrame(tick);
  };

  return {
    start: () => {
      if (holding || completing) {
        return;
      }

      startedAt = getNow();
      holding = true;
      firedMilestones.clear();
      frameId = requestFrame(tick);
    },
    stop: () => {
      if (!holding) {
        return;
      }

      holding = false;
      cancelCurrentFrame();
      firedMilestones.clear();
      onProgress(0);
    },
    cleanup: () => {
      holding = false;
      cancelCurrentFrame();
      firedMilestones.clear();
    },
    isHolding: () => holding
  };
}
