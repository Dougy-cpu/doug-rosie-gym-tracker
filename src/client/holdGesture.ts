interface HoldGestureOptions {
  durationMs: number;
  getNow: () => number;
  onProgress: (progress: number) => void;
  onComplete: () => Promise<void>;
  onMilestone?: (milestone: HoldHapticMilestone) => void;
  requestFrame: (callback: () => void | Promise<void>) => number;
  cancelFrame: (frameId: number) => void;
}

export type HoldHapticMilestone = "600ms" | "1200ms" | "1800ms" | "2400ms";

export const holdHapticMilestones: Array<{ progress: number; milestone: HoldHapticMilestone; pattern: number | number[] }> = [
  { progress: 0.2, milestone: "600ms", pattern: 12 },
  { progress: 0.4, milestone: "1200ms", pattern: 18 },
  { progress: 0.6, milestone: "1800ms", pattern: 28 },
  { progress: 0.8, milestone: "2400ms", pattern: [35, 20, 45] }
];

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
