import { describe, expect, it } from 'vitest';
import { computeWorkload } from '../workload';
import type { FixedEvent, ScheduledBlock } from '../types';

const d = (s: string) => new Date(s);

describe('computeWorkload', () => {
  it('sums fixed and scheduled minutes per day and flags overload', () => {
    const fixedEvents: FixedEvent[] = [
      { id: 'c1', title: 'Class', type: 'class', start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T09:00:00Z') },
    ];
    const scheduled: ScheduledBlock[] = [
      { taskId: 't1', start: d('2026-01-05T09:00:00Z'), end: d('2026-01-05T10:30:00Z') },
    ];

    const workload = computeWorkload(fixedEvents, scheduled, 100);

    expect(workload).toEqual([
      { date: '2026-01-05', fixedMinutes: 60, scheduledMinutes: 90, totalMinutes: 150, isOverloaded: true },
    ]);
  });

  it('does not flag a day under the cap', () => {
    const scheduled: ScheduledBlock[] = [{ taskId: 't1', start: d('2026-01-05T09:00:00Z'), end: d('2026-01-05T10:00:00Z') }];

    const workload = computeWorkload([], scheduled, 100);

    expect(workload[0].isOverloaded).toBe(false);
  });

  it('splits an overnight event across the two UTC days it spans', () => {
    const fixedEvents: FixedEvent[] = [
      { id: 'w1', title: 'Night shift', type: 'work', start: d('2026-01-05T22:00:00Z'), end: d('2026-01-06T02:00:00Z') },
    ];

    const workload = computeWorkload(fixedEvents, [], 999);

    expect(workload).toEqual([
      { date: '2026-01-05', fixedMinutes: 120, scheduledMinutes: 0, totalMinutes: 120, isOverloaded: false },
      { date: '2026-01-06', fixedMinutes: 120, scheduledMinutes: 0, totalMinutes: 120, isOverloaded: false },
    ]);
  });
});
