import type { AchievementEvent } from "../shared/types.js";

export type FeedbackSound =
  | "tap"
  | "hold-charge"
  | "hold-cancel"
  | "daily"
  | "first"
  | "momentum"
  | "one-more"
  | "weekly-complete"
  | "couple-complete";

export type HapticPattern = number | number[];

export interface WorkoutFeedback {
  sound: FeedbackSound;
  haptic: HapticPattern;
  rewardClass: "reward-none" | "reward-daily" | "reward-first" | "reward-momentum" | "reward-pressure" | "reward-complete";
}

export interface AchievementFeedback {
  sound: FeedbackSound;
  haptic: HapticPattern;
}

export function getWorkoutFeedback({
  countAfter,
  created
}: {
  countAfter: number;
  created: boolean;
}): WorkoutFeedback {
  if (!created) {
    return { sound: "tap", haptic: 20, rewardClass: "reward-none" };
  }

  if (countAfter >= 4) {
    return { sound: "weekly-complete", haptic: [40, 40, 80, 40, 120], rewardClass: "reward-complete" };
  }

  if (countAfter === 3) {
    return { sound: "one-more", haptic: [20, 20, 30, 20, 60], rewardClass: "reward-pressure" };
  }

  if (countAfter === 2) {
    return { sound: "momentum", haptic: [20, 30, 40], rewardClass: "reward-momentum" };
  }

  if (countAfter === 1) {
    return { sound: "first", haptic: [30, 30, 70], rewardClass: "reward-first" };
  }

  return { sound: "daily", haptic: [20, 30, 40], rewardClass: "reward-daily" };
}

export function getAchievementFeedback(eventType: AchievementEvent["eventType"]): AchievementFeedback {
  if (eventType === "couple_week_complete") {
    return { sound: "couple-complete", haptic: [40, 30, 80, 40, 120, 60, 180] };
  }

  return { sound: "weekly-complete", haptic: [40, 40, 80, 40, 120] };
}
