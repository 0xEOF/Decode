/**
 * The date-math mock-data.ts already used to materialize recurring events
 * and build available-time windows, generalized to take `weekStart`/
 * `horizonDays` as parameters instead of hardcoding the demo's fixed
 * MOCK_NOW-derived constants. mock-data.ts calls these bound to MOCK_NOW
 * (unchanged demo behavior); real onboarding (app/api/onboarding/route.ts)
 * calls them bound to the actual current date.
 */
import type { FixedEvent } from '@decode/scheduling-engine';

/** How many days ahead recurring commitments get materialized for. See the known-limitation note on packages/db/src/schema.ts's fixedEvents table. */
export const HORIZON_DAYS = 14;

export function startOfWeek(date: Date): Date {
  const utcDay = date.getUTCDay(); // 0 = Sunday
  const mondayOffset = utcDay === 0 ? -6 : 1 - utcDay;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() + mondayOffset);
  return start;
}

/** `dayOffset` is 0 = the Monday of `weekStart`'s week, 1 = Tuesday, ... */
export function dateAt(weekStart: Date, dayOffset: number, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const result = new Date(weekStart);
  result.setUTCDate(result.getUTCDate() + dayOffset);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
}

export interface RecurringEventInput {
  /** FixedEvent ids are `${idPrefix}-${dayOffset}` — see colors.ts for `type: 'class'` id-parsing. */
  idPrefix: string;
  title: string;
  type: FixedEvent['type'];
  /** 0 = Monday ... 6 = Sunday. */
  days: number[];
  startTime: string;
  endTime: string;
}

/** Expands recurring weekly commitments (classes, work shifts, personal activities) into concrete FixedEvents across `horizonDays`. */
export function materializeRecurringEvents(
  weekStart: Date,
  horizonDays: number,
  items: RecurringEventInput[],
): FixedEvent[] {
  const events: FixedEvent[] = [];
  for (const item of items) {
    for (let week = 0; week * 7 < horizonDays; week++) {
      for (const day of item.days) {
        const dayOffset = week * 7 + day;
        if (dayOffset >= horizonDays) continue;
        events.push({
          id: `${item.idPrefix}-${dayOffset}`,
          title: item.title,
          type: item.type,
          start: dateAt(weekStart, dayOffset, item.startTime),
          end: dateAt(weekStart, dayOffset, item.endTime),
        });
      }
    }
  }
  return events;
}

/** Builds the `availableWindows` a SchedulingPreferences needs from a daily earliest/latest study time. */
export function buildAvailableWindows(weekStart: Date, horizonDays: number, earliestTime: string, latestTime: string) {
  return Array.from({ length: horizonDays }, (_, dayOffset) => ({
    start: dateAt(weekStart, dayOffset, earliestTime),
    end: dateAt(weekStart, dayOffset, latestTime),
  }));
}
