import { describe, expect, it } from 'vitest';
import { rebalanceSchedule } from '../rebalance';
import { computeWorkload } from '../workload';
import type { SchedulableTask, ScheduledBlock, SchedulingPreferences } from '../types';

const d = (s: string) => new Date(s);

const preferences: SchedulingPreferences = {
  availableWindows: [{ start: d('2026-01-05T08:00:00Z'), end: d('2026-01-06T20:00:00Z') }],
  minSessionMinutes: 15,
  preferredSessionMinutes: 60,
  breakMinutes: 0,
  maxDailyMinutes: 90,
};

function makeTask(overrides: Partial<SchedulableTask>): SchedulableTask {
  return {
    id: 't',
    title: 'Task',
    status: 'TODO',
    dueDate: d('2026-01-10T00:00:00Z'),
    estimatedMinutes: 60,
    priority: 1,
    ...overrides,
  };
}

describe('rebalanceSchedule', () => {
  it('moves the lowest-priority block off an overloaded day and leaves the higher-priority one in place', () => {
    const lowPriority = makeTask({ id: 'low', priority: 1 });
    const highPriority = makeTask({ id: 'high', priority: 5 });
    const scheduledBlocks: ScheduledBlock[] = [
      { taskId: 'low', start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T09:00:00Z') },
      { taskId: 'high', start: d('2026-01-05T09:00:00Z'), end: d('2026-01-05T10:00:00Z') },
    ];

    const result = rebalanceSchedule(scheduledBlocks, [lowPriority, highPriority], [], preferences, d('2026-01-05T00:00:00Z'));

    const highBlock = result.scheduled.find((b) => b.taskId === 'high');
    const lowBlock = result.scheduled.find((b) => b.taskId === 'low');

    expect(highBlock).toEqual({ taskId: 'high', start: d('2026-01-05T09:00:00Z'), end: d('2026-01-05T10:00:00Z') });
    expect(lowBlock).toBeDefined();
    expect(lowBlock!.start.getTime()).not.toBe(d('2026-01-05T08:00:00Z').getTime());

    const workload = computeWorkload([], result.scheduled, preferences.maxDailyMinutes);
    expect(workload.every((day) => !day.isOverloaded)).toBe(true);
  });

  it('is a no-op when no day is overloaded', () => {
    const task = makeTask({ id: 'solo' });
    const scheduledBlocks: ScheduledBlock[] = [
      { taskId: 'solo', start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T09:00:00Z') },
    ];

    const result = rebalanceSchedule(scheduledBlocks, [task], [], preferences, d('2026-01-05T00:00:00Z'));

    expect(result.scheduled).toEqual(scheduledBlocks);
    expect(result.unscheduled).toEqual([]);
  });
});
