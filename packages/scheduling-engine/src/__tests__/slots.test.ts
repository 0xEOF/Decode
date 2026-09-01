import { describe, expect, it } from 'vitest';
import { findAvailableSlots, subtractBusyIntervals } from '../slots';

const d = (s: string) => new Date(s);

describe('subtractBusyIntervals', () => {
  it('removes busy time and merges overlapping busy intervals', () => {
    const windows = [{ start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T12:00:00Z') }];
    const busy = [
      { start: d('2026-01-05T09:00:00Z'), end: d('2026-01-05T10:00:00Z') },
      { start: d('2026-01-05T09:30:00Z'), end: d('2026-01-05T11:00:00Z') },
    ];

    const free = subtractBusyIntervals(windows, busy);

    expect(free).toEqual([
      { start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T09:00:00Z') },
      { start: d('2026-01-05T11:00:00Z'), end: d('2026-01-05T12:00:00Z') },
    ]);
  });

  it('returns the whole window when there is no busy overlap', () => {
    const windows = [{ start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T09:00:00Z') }];
    const busy = [{ start: d('2026-01-06T00:00:00Z'), end: d('2026-01-06T01:00:00Z') }];

    expect(subtractBusyIntervals(windows, busy)).toEqual(windows);
  });

  it('returns nothing when busy fully covers the window', () => {
    const windows = [{ start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T09:00:00Z') }];
    const busy = [{ start: d('2026-01-05T07:00:00Z'), end: d('2026-01-05T10:00:00Z') }];

    expect(subtractBusyIntervals(windows, busy)).toEqual([]);
  });
});

describe('findAvailableSlots', () => {
  it('filters out intervals shorter than the requested duration', () => {
    const windows = [{ start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T12:00:00Z') }];
    const busy = [
      { start: d('2026-01-05T09:00:00Z'), end: d('2026-01-05T10:00:00Z') },
      { start: d('2026-01-05T09:30:00Z'), end: d('2026-01-05T11:00:00Z') },
    ];

    expect(findAvailableSlots(windows, busy, 90)).toEqual([]);
  });

  it('ranks earlier slots higher', () => {
    const windows = [{ start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T12:00:00Z') }];
    const busy = [
      { start: d('2026-01-05T09:00:00Z'), end: d('2026-01-05T10:00:00Z') },
      { start: d('2026-01-05T09:30:00Z'), end: d('2026-01-05T11:00:00Z') },
    ];

    const slots = findAvailableSlots(windows, busy, 30);

    expect(slots).toHaveLength(2);
    expect(slots[0].start).toEqual(d('2026-01-05T08:00:00Z'));
    expect(slots[1].start).toEqual(d('2026-01-05T11:00:00Z'));
    expect(slots[0].score).toBeGreaterThan(slots[1].score);
    expect(slots[0].score).toBe(100);
    expect(slots[1].score).toBe(0);
  });
});
