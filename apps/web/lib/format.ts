const TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' });
const WEEKDAY_SHORT = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
const MONTH_DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/**
 * All formatting here is UTC-based. The mock data and scheduling engine both
 * work in one consistent reference frame (see the timezone note in
 * `@decode/scheduling-engine`'s types.ts) rather than a real student
 * timezone, since there's no onboarding/profile yet to source one from.
 */
export function formatTime(date: Date): string {
  return TIME.format(date);
}

export function formatWeekday(date: Date): string {
  return WEEKDAY.format(date);
}

export function formatWeekdayShort(date: Date): string {
  return WEEKDAY_SHORT.format(date);
}

export function formatMonthDay(date: Date): string {
  return MONTH_DAY.format(date);
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** `days` uses the 0=Monday convention shared by mock-data.ts's Course.meetingDays. */
export function formatMeetingDays(days: number[]): string {
  return [...days]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day])
    .join('/');
}

export function formatTimeRange12h(startHHMM: string, endHHMM: string): string {
  const toDate = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(Date.UTC(2000, 0, 1, h, m));
  };
  return `${formatTime(toDate(startHHMM))}–${formatTime(toDate(endHHMM))}`;
}
