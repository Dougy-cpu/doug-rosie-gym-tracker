import { ChevronDown, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { getDeterministicQuote } from "../../content/quotes.js";
import { compareIsoDates, formatShortRange } from "../../shared/date.js";
import { getProgressTone } from "../../shared/progress.js";
import type { TrackerState, UserSlug, ViewerSlug } from "../../shared/types.js";
import { ConfirmRemove } from "./ConfirmRemove";
import { HoldToLogTile } from "./HoldToLogTile";
import { MuteToggle } from "./MuteToggle";
import { PersonalCalendar } from "./WorkoutCalendar";
import { WeekStrip } from "./WeekStrip";

interface PersonalTrackerProps {
  state: TrackerState;
  userSlug: UserSlug;
  muted: boolean;
  busy: boolean;
  onMuteChange: (muted: boolean) => void;
  onNavigate: (viewer: ViewerSlug) => void;
  onLog: (date: string, source: "hold" | "backfill") => Promise<void>;
  onRemove: (date: string) => Promise<void>;
}

export function PersonalTracker({
  state,
  userSlug,
  muted,
  busy,
  onMuteChange,
  onNavigate,
  onLog,
  onRemove
}: PersonalTrackerProps) {
  const [confirmDate, setConfirmDate] = useState<string | null>(null);
  const count = state.counts[userSlug].week;
  const target = state.counts[userSlug].target;
  const user = state.users.find((entry) => entry.slug === userSlug);
  const tone = getProgressTone(count, "personal");
  const todayDone = state.workoutsByUser[userSlug].includes(state.today);
  const quote = useMemo(
    () => getDeterministicQuote(tone.quoteContext, `${userSlug}-${state.week.start}-${count}`),
    [count, state.week.start, tone.quoteContext, userSlug]
  );

  return (
    <main className={`screen personal tone-${tone.accent}`}>
      <header className="top-bar">
        <button className="name-button" type="button" onClick={() => onNavigate(userSlug === "doug" ? "rosie" : "doug")}>
          {user?.displayName ?? userSlug}
          <ChevronDown aria-hidden="true" />
        </button>
        <MuteToggle muted={muted} onChange={onMuteChange} />
      </header>

      <section className="hero-panel">
        <p className="section-label">This week</p>
        <p className="range-label">{formatShortRange(state.week.start, state.week.end)}</p>
        <div className="progress-readout">
          <span>{Math.min(count, target)}</span>
          <small>/ {target}</small>
        </div>
        <p className="progress-copy">{tone.subcopy}</p>
      </section>

      <section className="primary-action">
        <p className="today-label">Today: {state.today}</p>
        <HoldToLogTile completed={todayDone} disabled={busy} onComplete={() => onLog(state.today, "hold")} />
      </section>

      <section className="status-panel">
        <h1>{tone.headline}</h1>
        <p>{quote}</p>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Week strip</h2>
          {busy ? <Loader2 className="spin" aria-hidden="true" /> : null}
        </div>
        <WeekStrip
          weekStart={state.week.start}
          today={state.today}
          workoutsByUser={state.workoutsByUser}
          mode="personal"
          userSlug={userSlug}
        />
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>{state.month.label}</h2>
          <span>Tap past dates to backfill</span>
        </div>
        <PersonalCalendar
          days={state.month.days}
          today={state.today}
          userSlug={userSlug}
          workoutsByUser={state.workoutsByUser}
          onAdd={(date) => {
            if (compareIsoDates(date, state.today) <= 0) {
              void onLog(date, "backfill");
            }
          }}
          onRemoveRequest={setConfirmDate}
        />
      </section>

      <section className="couple-link">
        <button type="button" onClick={() => onNavigate("couple")}>
          Couple view
          <span>{state.counts.couple.week} / {state.counts.couple.target}</span>
        </button>
      </section>

      {confirmDate ? (
        <ConfirmRemove
          date={confirmDate}
          onCancel={() => setConfirmDate(null)}
          onConfirm={() => {
            const date = confirmDate;
            setConfirmDate(null);
            void onRemove(date);
          }}
        />
      ) : null}
    </main>
  );
}
