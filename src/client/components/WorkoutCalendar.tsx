import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { compareIsoDates } from "../../shared/date.js";
import type { CalendarDay } from "../../shared/date.js";
import type { UserSlug } from "../../shared/types.js";
import { createHoldGestureController, type HoldGestureController } from "../holdGesture";
import { HOLD_TO_LOG_DURATION_MS } from "./HoldToLogTile";

interface PersonalCalendarProps {
  days: CalendarDay[];
  today: string;
  userSlug: UserSlug;
  workoutsByUser: Record<UserSlug, string[]>;
  onAdd: (date: string) => void;
  onRemoveRequest: (date: string) => void;
}

interface CoupleCalendarProps {
  days: CalendarDay[];
  today: string;
  workoutsByUser: Record<UserSlug, string[]>;
}

const labels = ["S", "M", "T", "W", "T", "F", "S"];
export const CALENDAR_HOLD_DURATION_MS = HOLD_TO_LOG_DURATION_MS;

export function PersonalCalendar({
  days,
  today,
  userSlug,
  workoutsByUser,
  onAdd,
  onRemoveRequest
}: PersonalCalendarProps) {
  const completedDates = workoutsByUser[userSlug];

  return (
    <CalendarShell>
      {days.map((day) => {
        const complete = completedDates.includes(day.isoDate);
        const future = compareIsoDates(day.isoDate, today) > 0;
        const className = getDayClass(day, today, complete, future);

        return complete ? (
          <button
            className={className}
            type="button"
            key={day.isoDate}
            disabled={future}
            onClick={() => onRemoveRequest(day.isoDate)}
          >
            <span>{day.dayOfMonth}</span>
            <Check aria-hidden="true" />
          </button>
        ) : (
          <HoldCalendarDayButton
            className={className}
            date={day.isoDate}
            dayOfMonth={day.dayOfMonth}
            disabled={future}
            key={day.isoDate}
            onComplete={onAdd}
          />
        );
      })}
    </CalendarShell>
  );
}

function HoldCalendarDayButton({
  className,
  date,
  dayOfMonth,
  disabled,
  onComplete
}: {
  className: string;
  date: string;
  dayOfMonth: number;
  disabled: boolean;
  onComplete: (date: string) => void;
}) {
  const [progress, setProgress] = useState(0);
  const controllerRef = useRef<HoldGestureController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.cleanup();
    };
  }, []);

  const start = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    controllerRef.current = createHoldGestureController({
      durationMs: CALENDAR_HOLD_DURATION_MS,
      getNow: () => performance.now(),
      onProgress: setProgress,
      requestFrame: (callback) => window.requestAnimationFrame(callback),
      cancelFrame: (frameId) => window.cancelAnimationFrame(frameId),
      onComplete: async () => onComplete(date)
    });
    controllerRef.current.start();
  };

  const stop = () => {
    controllerRef.current?.stop();
  };

  return (
    <button
      className={`${className} hold-calendar-day`}
      type="button"
      disabled={disabled}
      onClick={(event) => event.preventDefault()}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
    >
      <span className="calendar-hold-progress" style={{ transform: `scaleX(${progress})` }} />
      <span>{dayOfMonth}</span>
    </button>
  );
}

export function CoupleCalendar({ days, today, workoutsByUser }: CoupleCalendarProps) {
  return (
    <CalendarShell>
      {days.map((day) => {
        const dougDone = workoutsByUser.doug.includes(day.isoDate);
        const rosieDone = workoutsByUser.rosie.includes(day.isoDate);
        const complete = dougDone || rosieDone;
        const className = [
          getDayClass(day, today, complete, false),
          dougDone ? "doug-done" : "",
          rosieDone ? "rosie-done" : ""
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div className={className} key={day.isoDate}>
            <span>{day.dayOfMonth}</span>
            <span className="couple-marks" aria-hidden="true">
              {dougDone ? <i className="doug-mark" /> : null}
              {rosieDone ? <i className="rosie-mark" /> : null}
            </span>
          </div>
        );
      })}
    </CalendarShell>
  );
}

function CalendarShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="calendar">
      <div className="calendar-weekdays" aria-hidden="true">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="calendar-grid">{children}</div>
    </div>
  );
}

function getDayClass(day: CalendarDay, today: string, complete: boolean, future: boolean): string {
  return [
    "calendar-day",
    day.inMonth ? "" : "outside-month",
    complete ? "complete" : "",
    day.isoDate === today ? "today" : "",
    future ? "future" : ""
  ]
    .filter(Boolean)
    .join(" ");
}
