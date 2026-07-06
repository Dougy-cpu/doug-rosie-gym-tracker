import type { AchievementEvent } from "../shared/types.js";

export function mergeAchievementQueue(
  current: AchievementEvent[],
  incoming: AchievementEvent[],
  active: AchievementEvent | null
): AchievementEvent[] {
  const known = new Set(current.map((event) => event.id));
  if (active) {
    known.add(active.id);
  }

  const additions: AchievementEvent[] = [];
  for (const event of incoming) {
    if (known.has(event.id)) {
      continue;
    }

    known.add(event.id);
    additions.push(event);
  }

  return [...current, ...additions];
}
