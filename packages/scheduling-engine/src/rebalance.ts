import { computePriorityScore } from './priority';
import { scheduleTasks } from './scheduler';
import { computeWorkload } from './workload';
import type {
  FixedEvent,
  SchedulableTask,
  ScheduledBlock,
  ScheduleResult,
  SchedulingPreferences,
} from './types';

/**
 * First-pass rebalancer, per ROADMAP.md §6: on any day where scheduled
 * study time exceeds `preferences.maxDailyMinutes`, the lowest-priority
 * blocks are pulled off that day first (fixed commitments are never
 * touched) and an attempt is made to re-place the displaced minutes
 * elsewhere before each task's deadline. This is a heuristic, not an
 * optimizer — do not expect it to find a globally optimal redistribution.
 */
export function rebalanceSchedule(
  scheduledBlocks: ScheduledBlock[],
  tasks: SchedulableTask[],
  fixedEvents: FixedEvent[],
  preferences: SchedulingPreferences,
  now: Date,
): ScheduleResult {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const scoreById = new Map(tasks.map((task) => [task.id, computePriorityScore(task, tasks, now)]));

  const workload = computeWorkload(fixedEvents, scheduledBlocks, Number.MAX_SAFE_INTEGER);
  const overloadedDays = new Set(
    workload.filter((day) => day.scheduledMinutes > preferences.maxDailyMinutes).map((day) => day.date),
  );

  if (overloadedDays.size === 0) {
    return { scheduled: scheduledBlocks, unscheduled: [] };
  }

  const kept: ScheduledBlock[] = [];
  const displacedByTask = new Map<string, number>();

  for (const day of overloadedDays) {
    const blocksThatDay = scheduledBlocks
      .filter((block) => isOnUtcDay(block, day))
      .sort((a, b) => (scoreById.get(a.taskId) ?? 0) - (scoreById.get(b.taskId) ?? 0));

    let minutesThatDay = blocksThatDay.reduce((sum, block) => sum + minutesOf(block), 0);

    for (const block of blocksThatDay) {
      if (minutesThatDay <= preferences.maxDailyMinutes) {
        kept.push(block);
        continue;
      }
      const minutes = minutesOf(block);
      displacedByTask.set(block.taskId, (displacedByTask.get(block.taskId) ?? 0) + minutes);
      minutesThatDay -= minutes;
    }
  }

  // Blocks on non-overloaded days are untouched.
  for (const block of scheduledBlocks) {
    const day = dayOf(block);
    if (!overloadedDays.has(day)) kept.push(block);
  }

  if (displacedByTask.size === 0) {
    return { scheduled: scheduledBlocks, unscheduled: [] };
  }

  const syntheticTasks: SchedulableTask[] = [];
  for (const [taskId, minutes] of displacedByTask) {
    const original = taskById.get(taskId);
    if (!original) continue;
    syntheticTasks.push({ ...original, estimatedMinutes: minutes, dependsOn: undefined });
  }

  const keptAsFixedEvents: FixedEvent[] = kept.map((block) => ({
    id: `kept-${block.taskId}-${block.start.toISOString()}`,
    title: `Kept block for ${block.taskId}`,
    type: 'locked',
    start: block.start,
    end: block.end,
  }));

  // Block out overloaded days entirely for the re-placement pass. Just marking
  // `kept` blocks as busy is not enough: maxDailyMinutes in the fresh
  // scheduleTasks() call below only tracks minutes it places itself, so it
  // would happily fill the gaps `kept` left on the same day right back up to
  // the cap — recreating the overload this function exists to remove.
  const overloadedDayBlocks: FixedEvent[] = [...overloadedDays].map((day) => {
    const start = new Date(`${day}T00:00:00.000Z`);
    return {
      id: `overloaded-day-${day}`,
      title: `Overloaded day ${day}`,
      type: 'locked' as const,
      start,
      end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
    };
  });

  const replacement = scheduleTasks(
    syntheticTasks,
    [...fixedEvents, ...keptAsFixedEvents, ...overloadedDayBlocks],
    preferences,
    now,
  );

  return {
    scheduled: [...kept, ...replacement.scheduled],
    unscheduled: replacement.unscheduled,
  };
}

function minutesOf(block: ScheduledBlock): number {
  return (block.end.getTime() - block.start.getTime()) / 60_000;
}

function dayOf(block: ScheduledBlock): string {
  return block.start.toISOString().slice(0, 10);
}

function isOnUtcDay(block: ScheduledBlock, day: string): boolean {
  return dayOf(block) === day;
}
