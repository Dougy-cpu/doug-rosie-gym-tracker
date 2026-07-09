import type { AchievementEvent } from "../shared/types.js";

export type FeedbackSound =
  | "tap"
  | "hold-charge"
  | "hold-cancel"
  | "level-up-track"
  | "daily"
  | "backfill"
  | "first"
  | "momentum"
  | "one-more"
  | "weekly-complete"
  | "individual-complete"
  | "couple-complete";

export type RewardSoundEvent =
  | "levelUpTrack"
  | "daily"
  | "backfill"
  | "inertiaBroken"
  | "momentum"
  | "targetInRange"
  | "individualComplete"
  | "coupleComplete";

export type RewardSoundAssetSource = "primary" | "alias" | "fallback" | "fallback-specific-missing";
export type HapticPattern = number | number[];

export interface RewardSoundAssetCandidate {
  src: string;
  durationMs: number;
  sourceFile: string;
  expectedPrimaryFile: string;
  source: RewardSoundAssetSource;
  assignment: string;
}

export interface FeedbackSoundAsset extends RewardSoundAssetCandidate {}

export interface ResolvedFeedbackSoundAsset extends FeedbackSoundAsset {
  sound: FeedbackSound;
  event: RewardSoundEvent;
  candidateIndex: number;
  fallbackUsed: boolean;
}

export type RewardSoundAvailabilityChecker = (src: string) => Promise<boolean>;

export const LEVEL_UP_TRACK_SRC = "/sfx/level-up-track.mp3";
export const LEVEL_UP_TRACK_DURATION_MS = 6269;

export const rewardSoundAssets: Record<RewardSoundEvent, RewardSoundAssetCandidate[]> = {
  levelUpTrack: [
    asset("/sfx/level-up-track.mp3", 6269, "level-up-track.mp3", "level-up-track.mp3", "primary", "Manual level-up track test")
  ],
  daily: [
    asset("/sfx/daily-impact.mp3", 2952, "daily-impact.mp3", "daily-impact.mp3", "primary", "Normal daily workout"),
    asset("/audio/rewards/daily-session-locked.mp3", 2952, "battlefield_6_sting.mp3", "daily-impact.mp3", "alias", "Normal daily workout alias")
  ],
  backfill: [
    asset(
      "/audio/rewards/backfill-session-locked.mp3",
      2978,
      "warzone_victory.mp3",
      "backfill-session-locked.mp3",
      "primary",
      "Calendar backfill completion"
    ),
    asset("/sfx/daily-impact.mp3", 2952, "daily-impact.mp3", "backfill-session-locked.mp3", "fallback", "Calendar backfill heavy fallback")
  ],
  inertiaBroken: [
    asset("/sfx/inertia-broken.mp3", 3056, "inertia-broken.mp3", "inertia-broken.mp3", "primary", "1/4 inertia broken"),
    asset(
      "/audio/rewards/first-inertia-broken.mp3",
      3056,
      "call_of_duty.mp3",
      "inertia-broken.mp3",
      "alias",
      "1/4 inertia broken alias"
    ),
    asset(
      LEVEL_UP_TRACK_SRC,
      LEVEL_UP_TRACK_DURATION_MS,
      "level-up-track.mp3",
      "inertia-broken.mp3",
      "fallback-specific-missing",
      "1/4 inertia broken fallback"
    )
  ],
  momentum: [
    asset("/sfx/momentum.mp3", 3187, "momentum.mp3", "momentum.mp3", "primary", "2/4 momentum"),
    asset("/audio/rewards/momentum-two-banked.mp3", 3187, "battlefield_4_rank_up.mp3", "momentum.mp3", "alias", "2/4 momentum alias"),
    asset("/sfx/daily-impact.mp3", 2952, "daily-impact.mp3", "momentum.mp3", "fallback", "2/4 momentum fallback"),
    asset("/audio/rewards/daily-session-locked.mp3", 2952, "battlefield_6_sting.mp3", "momentum.mp3", "fallback", "2/4 momentum fallback alias")
  ],
  targetInRange: [
    asset("/sfx/target-in-range.mp3", 6269, "target-in-range.mp3", "target-in-range.mp3", "primary", "3/4 target in range"),
    asset(
      "/audio/rewards/target-in-range.mp3",
      6269,
      "call-of-duty-modern-warfare-2-level-up-track-2.mp3",
      "target-in-range.mp3",
      "alias",
      "3/4 target in range alias"
    ),
    asset("/sfx/daily-impact.mp3", 2952, "daily-impact.mp3", "target-in-range.mp3", "fallback", "3/4 target in range fallback"),
    asset(
      "/audio/rewards/daily-session-locked.mp3",
      2952,
      "battlefield_6_sting.mp3",
      "target-in-range.mp3",
      "fallback",
      "3/4 target in range fallback alias"
    )
  ],
  individualComplete: [
    asset("/sfx/individual-goal.mp3", 11154, "individual-goal.mp3", "individual-goal.mp3", "primary", "4/4 individual goal"),
    asset(
      "/sfx/individual-complete.mp3",
      11154,
      "individual-complete.mp3",
      "individual-goal.mp3",
      "alias",
      "4/4 individual goal alias"
    ),
    asset(
      "/sfx/individual-week-complete.mp3",
      11154,
      "individual-week-complete.mp3",
      "individual-goal.mp3",
      "alias",
      "4/4 individual goal alias"
    ),
    asset(
      "/audio/rewards/individual-week-complete.mp3",
      11154,
      "untitled_nscJ47E.mp3",
      "individual-goal.mp3",
      "alias",
      "4/4 individual uploaded alias"
    ),
    asset("/sfx/weekly-complete.mp3", 6426, "weekly-complete.mp3", "individual-goal.mp3", "alias", "4/4 weekly complete alias"),
    asset("/sfx/weekly-goal.mp3", 6426, "weekly-goal.mp3", "individual-goal.mp3", "alias", "4/4 weekly goal alias"),
    asset("/sfx/goal-complete.mp3", 6426, "goal-complete.mp3", "individual-goal.mp3", "alias", "4/4 goal complete alias"),
    asset(
      LEVEL_UP_TRACK_SRC,
      LEVEL_UP_TRACK_DURATION_MS,
      "level-up-track.mp3",
      "individual-goal.mp3",
      "fallback-specific-missing",
      "4/4 individual goal fallback"
    )
  ],
  coupleComplete: [
    asset("/sfx/couple-goal.mp3", 30067, "couple-goal.mp3", "couple-goal.mp3", "primary", "8/8 couple goal"),
    asset("/sfx/couple-complete.mp3", 30067, "couple-complete.mp3", "couple-goal.mp3", "alias", "8/8 couple goal alias"),
    asset(
      "/sfx/couple-week-complete.mp3",
      30067,
      "couple-week-complete.mp3",
      "couple-goal.mp3",
      "alias",
      "8/8 couple week complete alias"
    ),
    asset(
      "/audio/rewards/couple-week-complete.mp3",
      30067,
      "at_dooms_2016_gate.mp3",
      "couple-goal.mp3",
      "alias",
      "8/8 couple uploaded alias"
    ),
    asset("/sfx/team-complete.mp3", 30067, "team-complete.mp3", "couple-goal.mp3", "alias", "8/8 team complete alias"),
    asset("/sfx/team-goal.mp3", 30067, "team-goal.mp3", "couple-goal.mp3", "alias", "8/8 team goal alias"),
    asset(
      "/sfx/household-complete.mp3",
      30067,
      "household-complete.mp3",
      "couple-goal.mp3",
      "alias",
      "8/8 household complete alias"
    ),
    asset(
      LEVEL_UP_TRACK_SRC,
      LEVEL_UP_TRACK_DURATION_MS,
      "level-up-track.mp3",
      "couple-goal.mp3",
      "fallback-specific-missing",
      "8/8 couple goal fallback"
    )
  ]
};

export const feedbackSoundEvents: Record<FeedbackSound, RewardSoundEvent | null> = {
  tap: null,
  "hold-charge": null,
  "hold-cancel": null,
  "level-up-track": "levelUpTrack",
  daily: "daily",
  backfill: "backfill",
  first: "inertiaBroken",
  momentum: "momentum",
  "one-more": "targetInRange",
  "weekly-complete": "individualComplete",
  "individual-complete": "individualComplete",
  "couple-complete": "coupleComplete"
};

export const feedbackSoundAssets: Partial<Record<FeedbackSound, FeedbackSoundAsset>> = Object.fromEntries(
  Object.entries(feedbackSoundEvents).flatMap(([sound, event]) => {
    if (!event) {
      return [];
    }

    return [[sound, { ...rewardSoundAssets[event][0] }]];
  })
) as Partial<Record<FeedbackSound, FeedbackSoundAsset>>;

const synthesizedSoundDurations: Partial<Record<FeedbackSound, number>> = {
  tap: 120,
  "hold-charge": 240,
  "hold-cancel": 170
};

const defaultAvailabilityCache = new Map<string, Promise<boolean>>();
const defaultResolutionCache = new Map<FeedbackSound, Promise<ResolvedFeedbackSoundAsset | null>>();

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
  const event = feedbackSoundEvents[sound];
  return (event ? rewardSoundAssets[event][0]?.durationMs : undefined) ?? synthesizedSoundDurations[sound] ?? 1400;
}

export function getFeedbackSoundEvent(sound: FeedbackSound): RewardSoundEvent | null {
  return feedbackSoundEvents[sound];
}

export function getRewardSoundCandidates(sound: FeedbackSound): RewardSoundAssetCandidate[] {
  const event = feedbackSoundEvents[sound];
  return event ? rewardSoundAssets[event] : [];
}

export async function resolveFeedbackSoundAsset(
  sound: FeedbackSound,
  checkAvailability: RewardSoundAvailabilityChecker = checkRewardSoundAsset
): Promise<ResolvedFeedbackSoundAsset | null> {
  if (checkAvailability === checkRewardSoundAsset) {
    const cached = defaultResolutionCache.get(sound);
    if (cached) {
      return cached;
    }

    const resolution = resolveFeedbackSoundAssetUncached(sound, checkAvailability);
    defaultResolutionCache.set(sound, resolution);
    return resolution;
  }

  return resolveFeedbackSoundAssetUncached(sound, checkAvailability);
}

export async function checkRewardSoundAsset(src: string): Promise<boolean> {
  const cached = defaultAvailabilityCache.get(src);
  if (cached) {
    return cached;
  }

  const availability = checkRewardSoundAssetUncached(src);
  defaultAvailabilityCache.set(src, availability);
  return availability;
}

export function clearRewardSoundResolutionCache(): void {
  defaultAvailabilityCache.clear();
  defaultResolutionCache.clear();
}

export function logRewardSoundResolution(sound: FeedbackSound, resolvedAsset: ResolvedFeedbackSoundAsset | null): void {
  if (!isDevelopmentRuntime()) {
    return;
  }

  const event = feedbackSoundEvents[sound];
  if (!event && !resolvedAsset) {
    return;
  }

  if (!resolvedAsset) {
    console.warn(`[SFX] reward=${event} asset=synthetic-heavy-impact source=fallback-missing`);
    return;
  }

  console.info(`[SFX] reward=${resolvedAsset.event} asset=${resolvedAsset.src} source=${resolvedAsset.source}`);
  if (resolvedAsset.source === "fallback-specific-missing" && resolvedAsset.sourceFile === "level-up-track.mp3") {
    console.warn(
      `[SFX] reward=${resolvedAsset.event} asset=${resolvedAsset.src} source=fallback-specific-missing expected=${resolvedAsset.expectedPrimaryFile}`
    );
  }
}

function asset(
  src: string,
  durationMs: number,
  sourceFile: string,
  expectedPrimaryFile: string,
  source: RewardSoundAssetSource,
  assignment: string
): RewardSoundAssetCandidate {
  return {
    src,
    durationMs,
    sourceFile,
    expectedPrimaryFile,
    source,
    assignment
  };
}

async function resolveFeedbackSoundAssetUncached(
  sound: FeedbackSound,
  checkAvailability: RewardSoundAvailabilityChecker
): Promise<ResolvedFeedbackSoundAsset | null> {
  const event = feedbackSoundEvents[sound];
  if (!event) {
    return null;
  }

  const candidates = rewardSoundAssets[event];
  for (const [candidateIndex, candidate] of candidates.entries()) {
    if (await checkAvailability(candidate.src)) {
      return {
        ...candidate,
        sound,
        event,
        candidateIndex,
        fallbackUsed: candidate.source !== "primary"
      };
    }
  }

  return null;
}

async function checkRewardSoundAssetUncached(src: string): Promise<boolean> {
  if (typeof fetch !== "function") {
    return true;
  }

  try {
    const response = await fetch(src, { method: "HEAD", cache: "no-store" });
    const contentType = response.headers.get("content-type") ?? "";
    return response.ok && (contentType === "" || contentType.startsWith("audio/") || contentType === "application/octet-stream");
  } catch {
    return false;
  }
}

function isDevelopmentRuntime(): boolean {
  return Boolean(import.meta.env?.DEV);
}

function withDuration<T extends { sound: FeedbackSound }>(feedback: T): T & { durationMs: number } {
  return { ...feedback, durationMs: getFeedbackDurationMs(feedback.sound) };
}
