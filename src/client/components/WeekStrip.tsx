import { Check } from "lucide-react";
import { getWeekDates } from "../../shared/date.js";
import type { UserSlug } from "../../shared/types.js";

interface WeekStripProps {
  weekStart: string;
  today: string;
  workoutsByUser: Record<UserSlug, string[]>;
  mode: "personal" | "couple";
  userSlug?: UserSlug;
}

const labels = ["S", "M", "T", "W", "T", "F", "S"];

export function WeekStrip({ weekStart, today, workoutsByUser, mode, userSlug }: WeekStripProps) {
  return (
    <div className="week-strip" aria-label="Current week">
      {getWeekDates(weekStart).map((date, index) => {
        const dougDone = workoutsByUser.doug.includes(date);
        const rosieDone = workoutsByUser.rosie.includes(date);
        const personalDone = userSlug ? workoutsByUser[userSlug].includes(date) : false;
        const complete = mode === "couple" ? dougDone || rosieDone : personalDone;
        const className = [
          "week-day",
          complete ? "complete" : "",
          date === today ? "today" : "",
          mode === "couple" && dougDone ? "doug-done" : "",
          mode === "couple" && rosieDone ? "rosie-done" : ""
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div className={className} key={date}>
            <span>{labels[index]}</span>
            <strong>{Number(date.slice(-2))}</strong>
            {complete ? <Check aria-hidden="true" /> : null}
          </div>
        );
      })}
    </div>
  );
}
