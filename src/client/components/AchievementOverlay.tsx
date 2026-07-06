import { Trophy } from "lucide-react";
import { getDeterministicQuote } from "../../content/quotes.js";
import type { AchievementEvent, TrackerState, UserSlug } from "../../shared/types.js";

interface AchievementOverlayProps {
  achievement: AchievementEvent;
  state: TrackerState;
  viewer: UserSlug;
  onDismiss: () => void;
}

export function AchievementOverlay({ achievement, state, viewer, onDismiss }: AchievementOverlayProps) {
  const isCouple = achievement.eventType === "couple_week_complete";
  const viewerName = state.users.find((user) => user.slug === viewer)?.displayName ?? "You";
  const title = isCouple ? "Couple Week Complete" : "Weekly Target Complete";
  const metric = isCouple ? "8/8" : "4/4";
  const copy = isCouple ? "Household objective complete." : `${viewerName} handled the week.`;
  const quote = getDeterministicQuote(
    isCouple ? "couple-complete" : "individual-complete",
    `${achievement.eventType}-${achievement.weekStartDate}-${viewer}`
  );

  return (
    <div className="achievement-backdrop" role="dialog" aria-modal="true" aria-labelledby="achievement-title">
      <section className={isCouple ? "achievement-card couple" : "achievement-card"}>
        <div className="achievement-burst" aria-hidden="true">
          <Trophy />
        </div>
        <p className="achievement-kicker">{copy}</p>
        <h2 id="achievement-title">{title}</h2>
        <strong>{metric}</strong>
        <p>{quote}</p>
        <button type="button" onClick={onDismiss}>
          Let's go
        </button>
      </section>
    </div>
  );
}
