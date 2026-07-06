export const LONDON_TIME_ZONE = "Europe/London";

export interface CalendarDay {
  isoDate: string;
  dayOfMonth: number;
  inMonth: boolean;
  weekdayIndex: number;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function assertIsoDate(isoDate: string): void {
  if (!isoDatePattern.test(isoDate)) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
}

export function parseIsoDate(isoDate: string): DateParts {
  assertIsoDate(isoDate);
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day };
}

export function formatIsoDate(parts: DateParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function isoDateToUtcDate(isoDate: string): Date {
  const { year, month, day } = parseIsoDate(isoDate);
  return new Date(Date.UTC(year, month - 1, day));
}

export function utcDateToIsoDate(date: Date): string {
  return formatIsoDate({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  });
}

export function addDays(isoDate: string, days: number): string {
  const date = isoDateToUtcDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateToIsoDate(date);
}

export function compareIsoDates(left: string, right: string): number {
  assertIsoDate(left);
  assertIsoDate(right);
  return left.localeCompare(right);
}

export function isDateInRange(isoDate: string, start: string, end: string): boolean {
  return compareIsoDates(isoDate, start) >= 0 && compareIsoDates(isoDate, end) <= 0;
}

export function isFutureDate(isoDate: string, today = getLondonTodayIso()): boolean {
  return compareIsoDates(isoDate, today) > 0;
}

export function getLondonTodayIso(now = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Could not resolve London calendar date");
  }

  return `${year}-${month}-${day}`;
}

export function getWeekRangeForDate(isoDate: string) {
  const date = isoDateToUtcDate(isoDate);
  const weekdayIndex = date.getUTCDay();
  const start = addDays(isoDate, -weekdayIndex);

  return {
    start,
    end: addDays(start, 6)
  };
}

export function getMonthRangeForDate(isoDate: string) {
  const { year, month } = parseIsoDate(isoDate);
  const start = formatIsoDate({ year, month, day: 1 });
  const endDate = new Date(Date.UTC(year, month, 0));
  const end = utcDateToIsoDate(endDate);

  return { start, end };
}

export function getMonthGrid(isoDate: string): CalendarDay[] {
  const { start, end } = getMonthRangeForDate(isoDate);
  const month = parseIsoDate(isoDate).month;
  const gridStart = addDays(start, -isoDateToUtcDate(start).getUTCDay());
  const endWeekday = isoDateToUtcDate(end).getUTCDay();
  const gridEnd = addDays(end, 6 - endWeekday);
  const days: CalendarDay[] = [];

  for (let day = gridStart; compareIsoDates(day, gridEnd) <= 0; day = addDays(day, 1)) {
    const parsed = parseIsoDate(day);
    days.push({
      isoDate: day,
      dayOfMonth: parsed.day,
      inMonth: parsed.month === month,
      weekdayIndex: isoDateToUtcDate(day).getUTCDay()
    });
  }

  return days;
}

export function getMonthLabel(isoDate: string): string {
  const { year, month } = parseIsoDate(isoDate);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatShortRange(start: string, end: string): string {
  const startParts = parseIsoDate(start);
  const endParts = parseIsoDate(end);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC"
  });

  return `${formatter.format(new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day)))} - ${formatter.format(
    new Date(Date.UTC(endParts.year, endParts.month - 1, endParts.day))
  )}`;
}

export function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}
