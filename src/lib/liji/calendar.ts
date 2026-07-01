import { addDays, differenceInCalendarDays, format } from "date-fns";
import { Lunar } from "lunar-javascript";

const WEEKDAY_OFFSET: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  日: 0,
  天: 0,
};

export const DEFAULT_REFERENCE_DATE = new Date("2026-07-01T09:00:00+08:00");

export function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function resolveRelativeChineseDate(
  input: string,
  referenceDate = DEFAULT_REFERENCE_DATE
) {
  if (input.includes("明天")) {
    return toIsoDate(addDays(referenceDate, 1));
  }
  if (input.includes("后天")) {
    return toIsoDate(addDays(referenceDate, 2));
  }

  const nextWeekMatch = input.match(/下周([一二三四五六日天])/);
  if (nextWeekMatch) {
    const target = WEEKDAY_OFFSET[nextWeekMatch[1]];
    const current = referenceDate.getDay();
    const daysUntilNextWeek = ((target - current + 7) % 7) + 7;
    return toIsoDate(addDays(referenceDate, daysUntilNextWeek));
  }

  const absolute = input.match(/(20\d{2})[年/-](\d{1,2})[月/-](\d{1,2})/);
  if (absolute) {
    const [, year, month, day] = absolute;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return toIsoDate(referenceDate);
}

export function resolveLunarDate(year: number, lunarMonth: number, lunarDay: number) {
  return Lunar.fromYmd(year, lunarMonth, lunarDay).getSolar().toYmd();
}

export function countInclusiveDays(startDate: string, endDate?: string) {
  if (!endDate) {
    return 1;
  }
  return Math.max(
    1,
    differenceInCalendarDays(new Date(`${endDate}T00:00:00`), new Date(`${startDate}T00:00:00`)) + 1
  );
}
