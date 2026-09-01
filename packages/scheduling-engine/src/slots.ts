import type { RankedSlot, TimeRange } from './types';

/**
 * Subtracts busy intervals from a set of windows, returning the remaining
 * free time. Overlapping/adjacent busy intervals are merged first so the
 * sweep below only has to reason about one sorted, non-overlapping list.
 */
export function subtractBusyIntervals(windows: TimeRange[], busy: TimeRange[]): TimeRange[] {
  const mergedBusy = mergeIntervals(busy);
  const free: TimeRange[] = [];

  for (const window of windows) {
    let cursor = window.start;

    for (const b of mergedBusy) {
      if (b.end <= cursor || b.start >= window.end) continue;

      if (b.start > cursor) {
        free.push({ start: cursor, end: minDate(b.start, window.end) });
      }
      if (b.end > cursor) {
        cursor = b.end;
      }
      if (cursor >= window.end) break;
    }

    if (cursor < window.end) {
      free.push({ start: cursor, end: window.end });
    }
  }

  return free;
}

function mergeIntervals(intervals: TimeRange[]): TimeRange[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: TimeRange[] = [{ ...sorted[0] }];

  for (const current of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      if (current.end > last.end) last.end = current.end;
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function minDate(a: Date, b: Date): Date {
  return a < b ? a : b;
}

/**
 * Finds candidate slots of at least `durationMinutes` within the given
 * windows, avoiding `busy` intervals. Returns one candidate per qualifying
 * free interval — anchored at that interval's start — rather than every
 * possible offset within it, to avoid combinatorial explosion.
 *
 * Scoring is a simple earlier-is-better heuristic (tunable later, per
 * ROADMAP.md §5): the highest-scoring slot is the earliest one, and score
 * decays the further out a slot starts relative to the earliest and latest
 * candidate start times found in this call.
 */
export function findAvailableSlots(
  windows: TimeRange[],
  busy: TimeRange[],
  durationMinutes: number,
): RankedSlot[] {
  const durationMs = durationMinutes * 60_000;
  const free = subtractBusyIntervals(windows, busy)
    .filter((interval) => interval.end.getTime() - interval.start.getTime() >= durationMs)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (free.length === 0) return [];

  const earliest = free[0].start.getTime();
  const latest = free[free.length - 1].start.getTime();
  const span = latest - earliest;

  return free.map((interval) => {
    const offset = interval.start.getTime() - earliest;
    const score = span === 0 ? 100 : 100 - (offset / span) * 100;
    return { start: interval.start, end: interval.end, score };
  });
}
