import { describe, expect, it } from 'vitest';
import { computePriorityScore } from '../priority';
import type { SchedulableTask } from '../types';

const now = new Date('2026-01-01T00:00:00Z');

function makeTask(overrides: Partial<SchedulableTask> = {}): SchedulableTask {
  return {
    id: 't1',
    title: 'Task',
    status: 'TODO',
    dueDate: new Date('2026-01-08T00:00:00Z'),
    estimatedMinutes: 60,
    priority: 1,
    ...overrides,
  };
}

describe('computePriorityScore', () => {
  it('ranks overdue > due-today > near-deadline > far-deadline', () => {
    const overdue = makeTask({ id: 'overdue', dueDate: new Date('2025-12-30T00:00:00Z') });
    const dueToday = makeTask({ id: 'today', dueDate: new Date('2026-01-01T00:00:00Z') });
    const near = makeTask({ id: 'near', dueDate: new Date('2026-01-08T00:00:00Z') });
    const far = makeTask({ id: 'far', dueDate: new Date('2026-01-20T00:00:00Z') });
    const all = [overdue, dueToday, near, far];

    const scores = all.map((t) => computePriorityScore(t, all, now));

    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBeGreaterThan(scores[2]);
    expect(scores[2]).toBeGreaterThan(scores[3]);
  });

  it('increases with grade weight', () => {
    const lowWeight = makeTask({ gradeWeight: 0 });
    const highWeight = makeTask({ gradeWeight: 80 });

    expect(computePriorityScore(highWeight, [highWeight], now)).toBeGreaterThan(
      computePriorityScore(lowWeight, [lowWeight], now),
    );
  });

  it('increases with student-set priority', () => {
    const low = makeTask({ priority: 1 });
    const high = makeTask({ priority: 5 });

    expect(computePriorityScore(high, [high], now)).toBeGreaterThan(computePriorityScore(low, [low], now));
  });

  it('increases with the number of dependent tasks, capped', () => {
    const blocker = makeTask({ id: 'blocker' });
    const dependent1 = makeTask({ id: 'd1', dependsOn: ['blocker'] });
    const dependent2 = makeTask({ id: 'd2', dependsOn: ['blocker'] });
    const noDependents = makeTask({ id: 'lonely' });

    const withDependents = computePriorityScore(blocker, [blocker, dependent1, dependent2], now);
    const withoutDependents = computePriorityScore(noDependents, [noDependents], now);

    expect(withDependents).toBeGreaterThan(withoutDependents);
    expect(withDependents - withoutDependents).toBe(30);
  });

  it('adds a flat overdue penalty only for non-DONE tasks past their deadline', () => {
    const overdueTodo = makeTask({ status: 'TODO', dueDate: new Date('2025-12-30T00:00:00Z') });
    const overdueDone = makeTask({ status: 'DONE', dueDate: new Date('2025-12-30T00:00:00Z') });

    expect(computePriorityScore(overdueTodo, [overdueTodo], now)).toBeGreaterThan(
      computePriorityScore(overdueDone, [overdueDone], now),
    );
  });
});
