import type { AchievementEvent } from "../shared/types.js";

export type FeedbackSound =
  | "tap"
  | "hold-charge"
  | "hold-cancel"
  | "daily"
  | "backfill"
  | "first"
  | "momentum"
  | "one-more"
  | "weekly-complete"
  | "individual-complete"
  | "couple-complete";

export type HapticPattern = number | number[];

export interface FeedbackSoundAsset {
  src: string;
  durationMs: number;
}

export const feedbackSoundAssets: Partial<Record<FeedbackSound, FeedbackSoundAsset>> = {
  daily: { src: "/audio/rewards/daily-session-locked.mp3", durationMs: 2879 },
  backfill: { src: "/audio/rewards/backfill-session-locked.mp3", durationMs: 2916 },
  first: { src: "/audio/rewards/first-inertia-broken.mp3", durationMs: 3004 },
  momentum: { src: "/audio/rewards/momentum-two-banked.mp3", durationMs: 3111 },
  "one-more": { src: "/audio/rewards/target-in-range.mp3", durationMs: 6200 },
  "weekly-complete": { src: "/audio/rewards/weekly-target-locked.mp3", durationMs: 6362 },
  "individual-complete": { src: "/audio/rewards/individual-week-complete.mp3", durationMs: 11102 },
  "couple-complete": { src: "/audio/rewards/couple-week-complete.mp3", durationMs: 30000 }
};

const synthesizedSoundDurations: Partial<Record<FeedbackSound, number>> = {
  tap: 120,
  "hold-charge": 240,
  "hold-cancel": 170
};

export interface WorkoutFeedback {
  sound: FeedbackSound;
  haptic: HapticPattern;
  rewardClass: "reward-none" | "reward-daily" | "reward-first" | "reward-momentum" | "reward-pressure" | "reward-complete";
  durationMs: number;
}

export interface AchievementFeedback {
  sound: FeedbackSound;
  haptic: HapticPattern;
  durationMs: number;
}

export function getWorkoutFeedback({
  countAfter,
  created,
  source = "hold"
}: {
  countAfter: number;
  created: boolean;
  source?: "hold" | "backfill";
}): WorkoutFeedback {
  if (!created) {
    return withDuration({ sound: "tap", haptic: 20, rewardClass: "reward-none" });
  }

  if (countAfter >= 4) {
    return withDuration({ sound: "weekly-complete", haptic: [40, 40, 80, 40, 120], rewardClass: "reward-complete" });
  }

  if (countAfter === 3) {
    return withDuration({ sound: "one-more", haptic: [20, 20, 30, 20, 60], rewardClass: "reward-pressure" });
  }

  if (countAfter === 2) {
    return withDuration({ sound: "momentum", haptic: [20, 30, 40], rewardClass: "reward-momentum" });
  }

  if (countAfter === 1) {
    return withDuration({ sound: "first", haptic: [30, 30, 70], rewardClass: "reward-first" });
  }

  return withDuration({
    sound: source === "backfill" ? "backfill" : "daily",
    haptic: [20, 30, 40],
    rewardClass: "reward-daily"
  });
}

export function getAchievementFeedback(eventType: AchievementEvent["eventType"]): AchievementFeedback {
  if (eventType === "couple_week_complete") {
    return withDuration({ sound: "couple-complete", haptic: [40, 30, 80, 40, 120, 60, 180] });
  }

  return withDuration({ sound: "individual-complete", haptic: [40, 40, 80, 40, 120] });
}

export function getFeedbackDurationMs(sound: FeedbackSound): number {
  return feedbackSoundAssets[sound]?.durationMs ?? synthesizedSoundDurations[sound] ?? 1400;
}

function withDuration<T extends { sound: FeedbackSound }>(feedback: T): T & { durationMs: number } {
  return { ...feedback, durationMs: getFeedbackDurationMs(feedback.sound) };
}
