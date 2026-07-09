import { Crown, ShieldCheck, Trophy } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";
import { getDeterministicQuote } from "../../content/quotes.js";
import type { AchievementEvent, TrackerState, UserSlug } from "../../shared/types.js";
import { getAchievementFeedback } from "../rewardFeedback";
import { ProgressSegments } from "./ProgressSegments";

interface AchievementOverlayProps {
  achievement: AchievementEvent;
  state: TrackerState;
  viewer: UserSlug;
  durationMs?: number;
  onDismiss: () => void;
}

export function AchievementOverlay({ achievement, state, viewer, durationMs: requestedDurationMs, onDismiss }: AchievementOverlayProps) {
  const [canDismiss, setCanDismiss] = useState(false);
  const [played, setPlayed] = useState(false);
  const isCouple = achievement.eventType === "couple_week_complete";
  const viewerName = state.users.find((user) => user.slug === viewer)?.displayName ?? "You";
  const title = isCouple ? "COUPLE WEEK COMPLETE" : "WEEKLY TARGET COMPLETE";
  const metric = isCouple ? "8 / 8" : "4 / 4";
  const copy = isCouple ? "HOUSEHOLD OBJECTIVE COMPLETE" : `${viewerName.toUpperCase()} LOCKED THE WEEKLY TARGET`;
  const durationMs = requestedDurationMs ?? getAchievementFeedback(achievement.eventType).durationMs;
  const quote = getDeterministicQuote(
    isCouple ? "couple-complete" : "individual-complete",
    `${achievement.eventType}-${achievement.weekStartDate}-${viewer}`
  );

  useEffect(() => {
    setCanDismiss(false);
    setPlayed(false);
    const dismissTimerId = window.setTimeout(() => setCanDismiss(true), Math.min(1800, Math.max(900, durationMs * 0.12)));
    const playedTimerId = window.setTimeout(() => setPlayed(true), durationMs);
    return () => {
      window.clearTimeout(dismissTimerId);
      window.clearTimeout(playedTimerId);
    };
  }, [achievement.id, durationMs]);

  return (
    <div
      className={["achievement-backdrop", isCouple ? "couple-achievement" : "", played ? "achievement-played" : ""]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-title"
    >
      <section
        className={isCouple ? "achievement-card couple" : "achievement-card"}
        style={
          {
            "--achievement-duration": `${durationMs}ms`,
            "--achievement-impact-at": `${Math.round(durationMs * (isCouple ? 0.3 : 0.15))}ms`,
            "--achievement-lock-at": `${Math.round(durationMs * (isCouple ? 0.85 : 0.75))}ms`,
            "--achievement-final-at": `${Math.round(durationMs * (isCouple ? 0.9 : 0.82))}ms`
          } as CSSProperties
        }
      >
        <div className="achievement-stage-glow" aria-hidden="true" />

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
          <>
            <div className="achievement-badge-unlock">
              <ShieldCheck aria-hidden="true" />
              <span>BADGE UNLOCKED</span>
            </div>
            <ProgressSegments value={4} target={4} className="achievement-segments" />
          </>
        )}

        <p>{quote}</p>
        <button type="button" disabled={!canDismiss} onClick={onDismiss}>
          {!canDismiss ? "CHARGING..." : played ? "CONTINUE" : "DISMISS & BANK IT"}
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
