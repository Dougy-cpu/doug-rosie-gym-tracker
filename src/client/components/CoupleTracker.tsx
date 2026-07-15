import { ChevronLeft, Heart, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { getDeterministicQuote } from "../../content/quotes.js";
import { formatShortRange } from "../../shared/date.js";
import { getProgressTone } from "../../shared/progress.js";
import type { TrackerState, ViewerSlug } from "../../shared/types.js";
import { MuteToggle } from "./MuteToggle";
import { CoupleCalendar } from "./WorkoutCalendar";
import { ProgressSegments } from "./ProgressSegments";
import { WeekStrip } from "./WeekStrip";

interface CoupleTrackerProps {
  state: TrackerState;
  muted: boolean;
  onMuteChange: (muted: boolean) => void;
  onNavigate: (viewer: ViewerSlug) => void;
}

export function CoupleTracker({ state, muted, onMuteChange, onNavigate }: CoupleTrackerProps) {
  const count = state.counts.couple.week;
  const target = state.counts.couple.target;
  const tone = getProgressTone(count, "couple");
  const quote = useMemo(
    () => getDeterministicQuote(tone.quoteContext, `couple-${state.week.start}-${count}`),
    [count, state.week.start, tone.quoteContext]
  );

  return (
    <main className={`screen couple tone-${tone.accent} intensity-${tone.intensity}`}>
      <header className="mission-header">
        <button className="icon-button" type="button" aria-label="Back to Doug" onClick={() => onNavigate("doug")}>
          <ChevronLeft />
        </button>
        <div className="title-lockup">
          <Heart aria-hidden="true" />
          <span>Couple</span>
          <p>{formatShortRange(state.week.start, state.week.end)}</p>
        </div>
        <div className="header-actions">
          <p>Household target // 8 per week</p>
          <MuteToggle muted={muted} onChange={onMuteChange} />
        </div>
      </header>

      <section className="mission-hero couple-hero">
        <div className="hero-grid" aria-hidden="true" />
        <p className="hero-eyebrow">HOUSEHOLD TARGET // 8 SESSIONS</p>
        <p className="mission-status">
          <ShieldCheck aria-hidden="true" />
          {count >= target ? "Household Conquered" : "Household Target"}
        </p>
        <div className="progress-readout">
          <span>{Math.min(count, target)}</span>
          <small>/ {target}</small>
        </div>
        <ProgressSegments value={count} target={target} className="couple-segments" />
        <div className="couple-scoreboard" aria-label="Doug and Rosie weekly progress">
          <CoupleScore label="Doug" value={state.counts.doug.week} target={state.counts.doug.target} tone="doug" />
          <CoupleScore label="Rosie" value={state.counts.rosie.week} target={state.counts.rosie.target} tone="rosie" />
        </div>
      </section>

      <section className="quote-card couple-status">
        <p className="section-label">Household prompt</p>
        <blockquote>{quote}</blockquote>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Household week</h2>
          <span>No weak link</span>
        </div>
        <WeekStrip weekStart={state.week.start} today={state.today} workoutsByUser={state.workoutsByUser} mode="couple" />
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>{state.month.label}</h2>
          <span>Gold Doug, pink Rosie</span>
        </div>
        <CoupleCalendar days={state.month.days} today={state.today} workoutsByUser={state.workoutsByUser} />
      </section>

      <section className="person-links">
        <button type="button" onClick={() => onNavigate("doug")}>
          Doug
          <span>{state.counts.doug.week} / 4</span>
        </button>
        <button type="button" onClick={() => onNavigate("rosie")}>
          Rosie
          <span>{state.counts.rosie.week} / 4</span>
        </button>
      </section>
    </main>
  );
}

function CoupleScore({
  label,
  value,
  target,
  tone
}: {
  label: string;
  value: number;
  target: number;
  tone: "doug" | "rosie";
}) {
  return (
    <div className={`couple-score ${tone} ${value >= target ? "locked" : ""}`}>
      <span>{label}</span>
      <strong>{Math.min(value, target)}<small> / {target}</small></strong>
      <ProgressSegments value={value} target={target} />
      <b>{value >= target ? "LOCKED" : `${Math.max(0, target - value)} TO GO`}</b>
    </div>
  );
}
