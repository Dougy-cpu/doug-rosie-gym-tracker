import { ChevronLeft, Heart } from "lucide-react";
import { useMemo } from "react";
import { getDeterministicQuote } from "../../content/quotes.js";
import { formatShortRange } from "../../shared/date.js";
import { getProgressTone } from "../../shared/progress.js";
import type { TrackerState, ViewerSlug } from "../../shared/types.js";
import { MuteToggle } from "./MuteToggle";
import { CoupleCalendar } from "./WorkoutCalendar";
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
    <main className={`screen couple tone-${tone.accent}`}>
      <header className="top-bar">
        <button className="icon-button" type="button" aria-label="Back to Doug" onClick={() => onNavigate("doug")}>
          <ChevronLeft />
        </button>
        <div className="title-lockup">
          <Heart aria-hidden="true" />
          <span>Couple</span>
        </div>
        <MuteToggle muted={muted} onChange={onMuteChange} />
      </header>

      <section className="hero-panel couple-hero">
        <p className="section-label">This week</p>
        <p className="range-label">{formatShortRange(state.week.start, state.week.end)}</p>
        <div className="progress-readout">
          <span>{Math.min(count, target)}</span>
          <small>/ {target}</small>
        </div>
        <div className="couple-bars" aria-label="Doug and Rosie weekly progress">
          <ProgressMini label="Doug" value={state.counts.doug.week} target={state.counts.doug.target} />
          <ProgressMini label="Rosie" value={state.counts.rosie.week} target={state.counts.rosie.target} />
        </div>
      </section>

      <section className="status-panel couple-status">
        <h1>{tone.headline}</h1>
        <p>{quote}</p>
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

function ProgressMini({ label, value, target }: { label: string; value: number; target: number }) {
  const progress = Math.min(1, value / target);

  return (
    <div className="progress-mini">
      <div>
        <span>{label}</span>
        <strong>{value} / {target}</strong>
      </div>
      <i>
        <b style={{ transform: `scaleX(${progress})` }} />
      </i>
    </div>
  );
}
