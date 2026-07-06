import { Check } from "lucide-react";
import { compareIsoDates } from "../../shared/date.js";
import type { CalendarDay } from "../../shared/date.js";
import type { UserSlug } from "../../shared/types.js";

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

        return (
          <button
            className={className}
            type="button"
            key={day.isoDate}
            disabled={future}
            onClick={() => {
              if (complete) {
                onRemoveRequest(day.isoDate);
              } else {
                onAdd(day.isoDate);
              }
            }}
          >
            <span>{day.dayOfMonth}</span>
            {complete ? <Check aria-hidden="true" /> : null}
          </button>
        );
      })}
    </CalendarShell>
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
