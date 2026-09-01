import { describe, expect, it } from 'vitest';
import { scheduleTasks } from '../scheduler';
import type { FixedEvent, SchedulableTask, SchedulingPreferences } from '../types';

const d = (s: string) => new Date(s);

function makePreferences(overrides: Partial<SchedulingPreferences> = {}): SchedulingPreferences {
  return {
    availableWindows: [{ start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T12:00:00Z') }],
    minSessionMinutes: 15,
    preferredSessionMinutes: 60,
    breakMinutes: 10,
    maxDailyMinutes: 240,
    ...overrides,
  };
}

function makeTask(overrides: Partial<SchedulableTask> = {}): SchedulableTask {
  return {
    id: 't1',
    title: 'Task',
    status: 'TODO',
    dueDate: d('2026-01-06T00:00:00Z'),
    estimatedMinutes: 60,
    priority: 3,
    ...overrides,
  };
}

const now = d('2026-01-05T00:00:00Z');

describe('scheduleTasks', () => {
  it('places a single task in the earliest available slot', () => {
    const result = scheduleTasks([makeTask()], [], makePreferences(), now);

    expect(result.unscheduled).toEqual([]);
    expect(result.scheduled).toEqual([{ taskId: 't1', start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T09:00:00Z') }]);
  });

  it('schedules around fixed events', () => {
    const fixedEvents: FixedEvent[] = [
      { id: 'c1', title: 'Class', type: 'class', start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T09:00:00Z') },
    ];

    const result = scheduleTasks([makeTask()], fixedEvents, makePreferences(), now);

    expect(result.scheduled).toEqual([{ taskId: 't1', start: d('2026-01-05T09:00:00Z'), end: d('2026-01-05T10:00:00Z') }]);
  });

  it('reports what could not be scheduled before the deadline', () => {
    const preferences = makePreferences({
      availableWindows: [{ start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T09:00:00Z') }],
    });
    const task = makeTask({ estimatedMinutes: 120, dueDate: d('2026-01-05T09:00:00Z') });

    const result = scheduleTasks([task], [], preferences, now);

    expect(result.scheduled).toEqual([{ taskId: 't1', start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T09:00:00Z') }]);
    expect(result.unscheduled).toEqual([{ task, remainingMinutes: 60, reason: 'no-capacity-before-deadline' }]);
  });

  it('spreads a task across days once maxDailyMinutes is hit', () => {
    const preferences = makePreferences({
      availableWindows: [
        { start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T20:00:00Z') },
        { start: d('2026-01-06T08:00:00Z'), end: d('2026-01-06T20:00:00Z') },
      ],
      preferredSessionMinutes: 180,
      maxDailyMinutes: 120,
      breakMinutes: 0,
    });
    const task = makeTask({ estimatedMinutes: 180, dueDate: d('2026-01-06T20:00:00Z') });

    const result = scheduleTasks([task], [], preferences, now);

    expect(result.unscheduled).toEqual([]);
    expect(result.scheduled).toEqual([
      { taskId: 't1', start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T10:00:00Z') },
      { taskId: 't1', start: d('2026-01-06T08:00:00Z'), end: d('2026-01-06T09:00:00Z') },
    ]);
  });

  it('splits a task into multiple sessions separated by the configured break', () => {
    const preferences = makePreferences({ preferredSessionMinutes: 40 });
    const task = makeTask({ estimatedMinutes: 80 });

    const result = scheduleTasks([task], [], preferences, now);

    expect(result.unscheduled).toEqual([]);
    expect(result.scheduled).toEqual([
      { taskId: 't1', start: d('2026-01-05T08:00:00Z'), end: d('2026-01-05T08:40:00Z') },
      { taskId: 't1', start: d('2026-01-05T08:50:00Z'), end: d('2026-01-05T09:30:00Z') },
    ]);
  });

  it('does not start a dependent task before its dependency finishes, even if it scores higher', () => {
    const a = makeTask({ id: 'a', priority: 3, estimatedMinutes: 30, dueDate: d('2026-01-07T00:00:00Z') });
    const b = makeTask({ id: 'b', priority: 5, estimatedMinutes: 30, dueDate: d('2026-01-07T00:00:00Z'), dependsOn: ['a'] });

    const result = scheduleTasks([a, b], [], makePreferences(), now);

    const blockA = result.scheduled.find((block) => block.taskId === 'a')!;
    const blockB = result.scheduled.find((block) => block.taskId === 'b')!;

    expect(blockA.start).toEqual(d('2026-01-05T08:00:00Z'));
    expect(blockB.start.getTime()).toBeGreaterThanOrEqual(blockA.end.getTime());
  });
});
