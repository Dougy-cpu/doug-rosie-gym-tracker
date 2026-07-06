interface HoldGestureOptions {
  durationMs: number;
  getNow: () => number;
  onProgress: (progress: number) => void;
  onComplete: () => Promise<void>;
  requestFrame: (callback: () => void | Promise<void>) => number;
  cancelFrame: (frameId: number) => void;
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
  requestFrame,
  cancelFrame
}: HoldGestureOptions): HoldGestureController {
  let frameId: number | null = null;
  let startedAt = 0;
  let holding = false;
  let completing = false;

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
      frameId = requestFrame(tick);
    },
    stop: () => {
      if (!holding) {
        return;
      }

      holding = false;
      cancelCurrentFrame();
      onProgress(0);
    },
    cleanup: () => {
      holding = false;
      cancelCurrentFrame();
    },
    isHolding: () => holding
  };
}
