import { dateKey } from './scheduler';
import type { DayWorkload, FixedEvent, ScheduledBlock, TimeRange } from './types';

/**
 * Groups fixed events and scheduled blocks by UTC calendar day and flags
 * days whose combined minutes exceed `maxTotalMinutesPerDay`.
 *
 * This is a distinct cap from `SchedulingPreferences.maxDailyMinutes`
 * (which only limits newly-scheduled study time and is already enforced by
 * `scheduleTasks`): `maxTotalMinutesPerDay` here covers fixed commitments
 * too, so a day can be flagged overloaded purely from back-to-back classes
 * even with zero scheduled study blocks. Pass the same number for both if
 * you don't need the distinction.
 */
export function computeWorkload(
  fixedEvents: FixedEvent[],
  scheduledBlocks: ScheduledBlock[],
  maxTotalMinutesPerDay: number,
): DayWorkload[] {
  const fixedByDay = new Map<string, number>();
  const scheduledByDay = new Map<string, number>();

  for (const event of fixedEvents) {
    accumulate(fixedByDay, event);
  }
  for (const block of scheduledBlocks) {
    accumulate(scheduledByDay, block);
  }

  const days = new Set([...fixedByDay.keys(), ...scheduledByDay.keys()]);

  return [...days]
    .sort()
    .map((date) => {
      const fixedMinutes = fixedByDay.get(date) ?? 0;
      const scheduledMinutes = scheduledByDay.get(date) ?? 0;
      const totalMinutes = fixedMinutes + scheduledMinutes;
      return {
        date,
        fixedMinutes,
        scheduledMinutes,
        totalMinutes,
        isOverloaded: totalMinutes > maxTotalMinutesPerDay,
      };
    });
}

function accumulate(byDay: Map<string, number>, range: TimeRange): void {
  for (const [day, minutes] of minutesPerUtcDay(range)) {
    byDay.set(day, (byDay.get(day) ?? 0) + minutes);
  }
}

/** Splits an interval's minutes across the UTC calendar days it spans (e.g. an overnight shift counts against both days). */
function minutesPerUtcDay(range: TimeRange): Map<string, number> {
  const result = new Map<string, number>();
  let cursor = range.start;

  while (cursor < range.end) {
    const dayEnd = new Date(`${dateKey(cursor)}T23:59:59.999Z`);
    const segmentEnd = dayEnd < range.end ? new Date(dayEnd.getTime() + 1) : range.end;
    const minutes = (segmentEnd.getTime() - cursor.getTime()) / 60_000;
    const day = dateKey(cursor);
    result.set(day, (result.get(day) ?? 0) + minutes);
    cursor = segmentEnd;
  }

  return result;
}
