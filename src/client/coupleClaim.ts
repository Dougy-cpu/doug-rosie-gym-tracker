import type { AchievementEvent, UserSlug } from "../shared/types.js";

export const coupleClaimTitles = [
  "COUPLE GOAL READY TO CLAIM",
  "HOUSEHOLD OBJECTIVE COMPLETE",
  "SHARED SMUGNESS WAITING",
  "8 / 8 HAS ENTERED THE CHAT",
  "YOUR REWARD IS WAITING",
  "THE HOUSE DID THE WORK"
] as const;

export const coupleClaimBodies = [
  "While you were away, the household stopped making excuses.",
  "The couple goal was hit. Try not to become unbearable.",
  "8 / 8 is waiting. Tap to collect your smugness.",
  "The sofa lost the week. Claim the evidence.",
  "The calendar is legally required to respect you both.",
  "Your partner finished the job. The house went 8 / 8.",
  "Domestic domination has been achieved. Tap to enjoy the nonsense.",
  "Shared smugness is available for collection.",
  "The weekly target has been completed by both parties. Horrifyingly competent behaviour.",
  "The household objective is complete. Claim your ridiculous little victory.",
  "No weak link this week. Tap to watch the app overreact.",
  "The excuses were outnumbered. Claim the explosion.",
  "Your reward is ready. The app has been saving the drama.",
  "8 sessions. 2 people. Zero sofa-based betrayal.",
  "You may now collect one serving of unreasonable satisfaction."
] as const;

export const coupleClaimButtons = [
  "CLAIM THE SMUGNESS",
  "DETONATE THE 8 / 8",
  "COLLECT THE NONSENSE",
  "RELEASE THE FIREWORKS",
  "CLAIM RIDICULOUS BEHAVIOUR",
  "UNLOCK DOMESTIC DOMINATION",
  "SHOW ME THE DAMAGE",
  "MAKE IT LOUD",
  "PLAY THE OVERREACTION",
  "CASH IN THE CHAOS"
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
