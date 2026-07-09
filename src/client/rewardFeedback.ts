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
  sourceFile: string;
  assignment: string;
}

export const feedbackSoundAssets: Partial<Record<FeedbackSound, FeedbackSoundAsset>> = {
  daily: {
    src: "/audio/rewards/daily-session-locked.mp3",
    durationMs: 2952,
    sourceFile: "battlefield_6_sting.mp3",
    assignment: "Today's workout completion"
  },
  backfill: {
    src: "/audio/rewards/backfill-session-locked.mp3",
    durationMs: 2978,
    sourceFile: "warzone_victory.mp3",
    assignment: "Calendar backfill completion"
  },
  first: {
    src: "/audio/rewards/first-inertia-broken.mp3",
    durationMs: 3056,
    sourceFile: "call_of_duty.mp3",
    assignment: "First workout of the week"
  },
  momentum: {
    src: "/audio/rewards/momentum-two-banked.mp3",
    durationMs: 3187,
    sourceFile: "battlefield_4_rank_up.mp3",
    assignment: "Second workout momentum"
  },
  "one-more": {
    src: "/audio/rewards/target-in-range.mp3",
    durationMs: 6269,
    sourceFile: "call-of-duty-modern-warfare-2-level-up-track-2.mp3",
    assignment: "Third workout, one more needed"
  },
  "weekly-complete": {
    src: "/audio/rewards/weekly-target-locked.mp3",
    durationMs: 6426,
    sourceFile: "warzone-level-up.mp3",
    assignment: "Fourth workout weekly target"
  },
  "individual-complete": {
    src: "/audio/rewards/individual-week-complete.mp3",
    durationMs: 11154,
    sourceFile: "untitled_nscJ47E.mp3",
    assignment: "Individual 4/4 achievement"
  },
  "couple-complete": {
    src: "/audio/rewards/couple-week-complete.mp3",
    durationMs: 30067,
    sourceFile: "at_dooms_2016_gate.mp3",
    assignment: "Couple 8/8 achievement"
  }
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
    return withDuration({ sound: "weekly-complete", haptic: [60, 40, 120, 50, 180], rewardClass: "reward-complete" });
  }

  if (countAfter === 3) {
    return withDuration({ sound: "one-more", haptic: [40, 20, 40, 20, 110], rewardClass: "reward-pressure" });
  }

  if (countAfter === 2) {
    return withDuration({ sound: "momentum", haptic: [35, 25, 55, 25, 80], rewardClass: "reward-momentum" });
  }

  if (countAfter === 1) {
    return withDuration({ sound: "first", haptic: [45, 30, 90], rewardClass: "reward-first" });
  }

  return withDuration({
    sound: source === "backfill" ? "backfill" : "daily",
    haptic: [35, 20, 60],
    rewardClass: "reward-daily"
  });
}

export function getAchievementFeedback(eventType: AchievementEvent["eventType"]): AchievementFeedback {
  if (eventType === "couple_week_complete") {
    return withDuration({ sound: "couple-complete", haptic: [70, 40, 130, 60, 200, 80, 240] });
  }

  return withDuration({ sound: "individual-complete", haptic: [60, 40, 120, 50, 180] });
}

export function getFeedbackDurationMs(sound: FeedbackSound): number {
  return feedbackSoundAssets[sound]?.durationMs ?? synthesizedSoundDurations[sound] ?? 1400;
}

function withDuration<T extends { sound: FeedbackSound }>(feedback: T): T & { durationMs: number } {
  return { ...feedback, durationMs: getFeedbackDurationMs(feedback.sound) };
}
