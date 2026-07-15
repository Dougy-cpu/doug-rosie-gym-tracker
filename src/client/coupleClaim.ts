import type { AchievementEvent, UserSlug } from "../shared/types.js";

export const coupleClaimTitles = [
  "SHARED SMUGNESS WAITING",
  "COUPLE GOAL READY TO DETONATE",
  "HOUSEHOLD OBJECTIVE COMPLETE",
  "8 / 8 IS ARMED",
  "DOMESTIC DOMINATION READY",
  "THE HOUSE WENT 8 / 8",
  "NO WEAK LINK DETECTED"
] as const;

export const coupleClaimBodies = [
  "While you were away, the household stopped making excuses.",
  "Your partner finished the job. The sofa is in ruins.",
  "The couple goal was hit. Try not to become unbearable.",
  "8 / 8 is waiting. Tap to collect your smugness.",
  "The calendar has been forced to respect you both.",
  "The excuses were outnumbered and frankly embarrassed.",
  "The app saved the overreaction for you.",
  "No weak link this week. Suspiciously competent behaviour.",
  "The house did the work. Now claim the fireworks.",
  "This is what accountability looks like when it gets annoying."
] as const;

export const coupleClaimButtons = [
  "DETONATE THE 8 / 8",
  "CLAIM THE SMUGNESS",
  "RELEASE THE FIREWORKS",
  "SHOW ME THE DAMAGE",
  "UNLOCK DOMESTIC DOMINATION",
  "PLAY THE OVERREACTION",
  "MAKE IT LOUD",
  "COLLECT THE NONSENSE"
] as const;

export interface CoupleClaimCopy {
  title: (typeof coupleClaimTitles)[number];
  body: (typeof coupleClaimBodies)[number];
  button: (typeof coupleClaimButtons)[number];
}

export function getCoupleClaimCopy(achievement: AchievementEvent, viewer: UserSlug): CoupleClaimCopy {
  const seed = hash(`${achievement.id}-${achievement.weekStartDate}-${viewer}`);
  return {
    title: coupleClaimTitles[seed % coupleClaimTitles.length],
    body: coupleClaimBodies[(seed * 3 + 5) % coupleClaimBodies.length],
    button: coupleClaimButtons[(seed * 7 + 2) % coupleClaimButtons.length]
  };
}

export function getPriorityCoupleClaim(events: AchievementEvent[]): AchievementEvent | null {
  return (
    events
      .filter((event) => event.eventType === "couple_week_complete")
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id - right.id)[0] ?? null
  );
}

export function sortTriggeredAchievements(events: AchievementEvent[]): AchievementEvent[] {
  return [...events].sort((left, right) => {
    const leftPriority = left.eventType === "individual_week_complete" ? 0 : 1;
    const rightPriority = right.eventType === "individual_week_complete" ? 0 : 1;
    return leftPriority - rightPriority || left.createdAt.localeCompare(right.createdAt) || left.id - right.id;
  });
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}
