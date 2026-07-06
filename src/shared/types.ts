import type { CalendarDay } from "./date.js";
import type { QuoteContext } from "./progress.js";

export type UserSlug = "doug" | "rosie";
export type ViewerSlug = UserSlug | "couple";

export interface AppUser {
  id: number;
  slug: UserSlug;
  displayName: string;
  createdAt: string;
}

export interface WeekRange {
  start: string;
  end: string;
}

export interface AchievementEvent {
  id: number;
  eventType: "individual_week_complete" | "couple_week_complete";
  userId: number | null;
  triggeringUserId: number | null;
  weekStartDate: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface CountSummary {
  week: number;
  target: number;
}

export interface TrackerState {
  viewer: ViewerSlug;
  pageUser: AppUser | null;
  users: AppUser[];
  today: string;
  week: WeekRange;
  month: {
    label: string;
    start: string;
    end: string;
    days: CalendarDay[];
  };
  workoutsByUser: Record<UserSlug, string[]>;
  counts: {
    doug: CountSummary;
    rosie: CountSummary;
    couple: CountSummary;
  };
  pendingAchievements: AchievementEvent[];
}

export interface ProgressTone {
  quoteContext: QuoteContext;
  intensity: "idle" | "first" | "momentum" | "pressure" | "complete";
  headline: string;
  subcopy: string;
  accent: "neutral" | "gold" | "lime" | "orange" | "red" | "pink";
}
