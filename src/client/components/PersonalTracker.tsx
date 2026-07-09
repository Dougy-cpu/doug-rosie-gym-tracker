import { BadgeCheck, ChevronDown, Crosshair, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { getDeterministicQuote } from "../../content/quotes.js";
import { compareIsoDates, formatShortRange } from "../../shared/date.js";
import { getProgressTone } from "../../shared/progress.js";
import type { TrackerState, UserSlug, ViewerSlug } from "../../shared/types.js";
import { ConfirmRemove } from "./ConfirmRemove";
import { HoldToLogTile, type HoldPressureMilestone } from "./HoldToLogTile";
import { MuteToggle } from "./MuteToggle";
import { PersonalCalendar } from "./WorkoutCalendar";
import { ProgressSegments } from "./ProgressSegments";
import { WeekStrip } from "./WeekStrip";

interface PersonalTrackerProps {
  state: TrackerState;
  userSlug: UserSlug;
  muted: boolean;
  busy: boolean;
  rewardClass: string;
  rewardDurationMs: number;
  onMuteChange: (muted: boolean) => void;
  onNavigate: (viewer: ViewerSlug) => void;
  onLog: (date: string, source: "hold" | "backfill") => Promise<void>;
  onRemove: (date: string) => Promise<void>;
  onHoldStart: () => void;
  onHoldCancel: () => void;
  onHoldPressurePulse: (milestone: HoldPressureMilestone) => void;
}

export function PersonalTracker({
  state,
  userSlug,
  muted,
  busy,
  rewardClass,
  rewardDurationMs,
  onMuteChange,
  onNavigate,
  onLog,
  onRemove,
  onHoldStart,
  onHoldCancel,
  onHoldPressurePulse
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

  const cappedCount = Math.min(count, target);
  const missionComplete = cappedCount >= target;

  return (
    <main className={`screen personal tone-${tone.accent} intensity-${tone.intensity}`}>
      <header className="mission-header">
        <div>
          <button className="name-button" type="button" onClick={() => onNavigate(userSlug === "doug" ? "rosie" : "doug")}>
            {user?.displayName ?? userSlug}
            <ChevronDown aria-hidden="true" />
          </button>
          <p className="range-label">{formatShortRange(state.week.start, state.week.end)}</p>
        </div>
        <div className="header-actions">
          <p>Gym target // {target} per week</p>
          <MuteToggle muted={muted} onChange={onMuteChange} />
        </div>
      </header>

      <section className="mission-hero" aria-live="polite">
        <div className="hero-grid" aria-hidden="true" />
        <p className="mission-status">
          <Crosshair aria-hidden="true" />
          {tone.headline}
        </p>
        <div className="progress-readout">
          <span>{cappedCount}</span>
          <small>/ {target}</small>
        </div>
        {missionComplete ? (
          <div className="mission-badge">
            <BadgeCheck aria-hidden="true" />
            <span>WEEK LOCKED</span>
          </div>
        ) : null}
        <ProgressSegments value={count} target={target} />
        <p className="progress-copy">{tone.subcopy}</p>
      </section>

      <section className="primary-action">
        <p className="today-label">Today: {state.today}</p>
        <HoldToLogTile
          completed={todayDone}
          disabled={busy}
          rewardClass={rewardClass}
          rewardDurationMs={rewardDurationMs}
          onComplete={() => onLog(state.today, "hold")}
          onHoldStart={onHoldStart}
          onHoldCancel={onHoldCancel}
          onHoldPressurePulse={onHoldPressurePulse}
        />
      </section>

      <section className="quote-card">
        <p className="section-label">Mission prompt</p>
        <blockquote>{quote}</blockquote>
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
          <span>Hold date to bank session</span>
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
          onHoldStart={onHoldStart}
          onHoldCancel={onHoldCancel}
        />
      </section>

      <section className="couple-link">
        <button type="button" onClick={() => onNavigate("couple")}>
          Household objective
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
