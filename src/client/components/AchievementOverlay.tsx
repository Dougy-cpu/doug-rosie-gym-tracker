import { Crown, ShieldCheck, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { getDeterministicQuote } from "../../content/quotes.js";
import type { AchievementEvent, TrackerState, UserSlug } from "../../shared/types.js";
import { ProgressSegments } from "./ProgressSegments";

interface AchievementOverlayProps {
  achievement: AchievementEvent;
  state: TrackerState;
  viewer: UserSlug;
  onDismiss: () => void;
}

export function AchievementOverlay({ achievement, state, viewer, onDismiss }: AchievementOverlayProps) {
  const [canDismiss, setCanDismiss] = useState(false);
  const isCouple = achievement.eventType === "couple_week_complete";
  const viewerName = state.users.find((user) => user.slug === viewer)?.displayName ?? "You";
  const title = isCouple ? "COUPLE WEEK COMPLETE" : "WEEKLY TARGET COMPLETE";
  const metric = isCouple ? "8 / 8" : "4 / 4";
  const copy = isCouple ? "HOUSEHOLD OBJECTIVE COMPLETE" : `${viewerName.toUpperCase()} LOCKED THE WEEKLY TARGET`;
  const quote = getDeterministicQuote(
    isCouple ? "couple-complete" : "individual-complete",
    `${achievement.eventType}-${achievement.weekStartDate}-${viewer}`
  );

  useEffect(() => {
    setCanDismiss(false);
    const timerId = window.setTimeout(() => setCanDismiss(true), 900);
    return () => window.clearTimeout(timerId);
  }, [achievement.id]);

  return (
    <div
      className={isCouple ? "achievement-backdrop couple-achievement" : "achievement-backdrop"}
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-title"
    >
      <section className={isCouple ? "achievement-card couple" : "achievement-card"}>
        <div className="achievement-shockwave" aria-hidden="true" />
        <div className="particle-field" aria-hidden="true">
          {Array.from({ length: isCouple ? 18 : 12 }, (_, index) => (
            <span key={index} />
          ))}
        </div>

        <div className="achievement-burst" aria-hidden="true">
          {isCouple ? <Crown /> : <Trophy />}
        </div>

        <p className="achievement-kicker">{copy}</p>
        <h2 id="achievement-title">{title}</h2>
        <strong>{metric}</strong>

        {isCouple ? (
          <>
            <CoupleSlamMeter />
            <div className="achievement-duo" aria-label="Doug and Rosie complete">
              <AchievementPerson label="Doug" value={state.counts.doug.week} />
              <ShieldCheck aria-hidden="true" />
              <AchievementPerson label="Rosie" value={state.counts.rosie.week} />
            </div>
          </>
        ) : (
          <ProgressSegments value={4} target={4} className="achievement-segments" />
        )}

        <p>{quote}</p>
        <button type="button" disabled={!canDismiss} onClick={onDismiss}>
          {canDismiss ? "CONTINUE" : "LOCKING..."}
        </button>
      </section>
    </div>
  );
}

function CoupleSlamMeter() {
  return (
    <div className="achievement-slam-meter" aria-label="Doug and Rosie bars slam together into 8 out of 8">
      <span className="slam-bar doug-slam" />
      <strong>8 / 8</strong>
      <span className="slam-bar rosie-slam" />
    </div>
  );
}

function AchievementPerson({ label, value }: { label: string; value: number }) {
  return (
    <div className="achievement-person">
      <span>{label}</span>
      <strong>{Math.min(value, 4)} / 4</strong>
      <ProgressSegments value={value} target={4} />
    </div>
  );
}
