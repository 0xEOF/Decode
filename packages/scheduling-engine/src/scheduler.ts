import { computePriorityScore } from './priority';
import { findAvailableSlots } from './slots';
import type {
  FixedEvent,
  SchedulableTask,
  ScheduledBlock,
  ScheduleResult,
  SchedulingPreferences,
  TimeRange,
  UnscheduledTask,
} from './types';

/**
 * Computes a schedule for `tasks` around `fixedEvents`, per ROADMAP.md §5.
 * Pure function: no I/O, no LLM calls, no wall-clock reads (`now` is a
 * parameter). Calendar-day grouping (for `maxDailyMinutes` and day-boundary
 * decisions) uses UTC day boundaries, matching every other date-bucketing
 * helper in this package — see the timezone note in types.ts.
 */
export function scheduleTasks(
  tasks: SchedulableTask[],
  fixedEvents: FixedEvent[],
  preferences: SchedulingPreferences,
  now: Date,
): ScheduleResult {
  const relevant = tasks.filter((task) => task.status !== 'DONE');
  const relevantIds = new Set(relevant.map((task) => task.id));

  const { order, blocked } = determineOrder(relevant, now);

  const scheduled: ScheduledBlock[] = [];
  const unscheduled: UnscheduledTask[] = [];
  const busy: TimeRange[] = fixedEvents.map((event) => ({ start: event.start, end: event.end }));
  const taskEnd = new Map<string, Date>();
  const dailyMinutes = new Map<string, number>();

  for (const task of blocked) {
    unscheduled.push({ task, remainingMinutes: task.estimatedMinutes, reason: 'unmet-dependency' });
  }

  for (const task of order) {
    const depIds = (task.dependsOn ?? []).filter((id) => relevantIds.has(id));
    const unmetDeps = depIds.some((id) => !taskEnd.has(id));

    if (unmetDeps) {
      unscheduled.push({ task, remainingMinutes: task.estimatedMinutes, reason: 'unmet-dependency' });
      continue;
    }

    const earliestStart = depIds.reduce((acc, id) => {
      const end = taskEnd.get(id)!;
      return end > acc ? end : acc;
    }, now);

    const { blocks, remainingMinutes } = scheduleOneTask(task, earliestStart, busy, preferences, dailyMinutes);

    if (blocks.length > 0) {
      scheduled.push(...blocks);
      busy.push(...blocks);
      taskEnd.set(task.id, blocks[blocks.length - 1].end);
    }

    if (remainingMinutes > 0) {
      unscheduled.push({ task, remainingMinutes, reason: 'no-capacity-before-deadline' });
    }
  }

  return { scheduled, unscheduled };
}

/** Kahn's-algorithm topological sort, breaking ties by priority score (higher first, then earlier deadline). */
function determineOrder(
  tasks: SchedulableTask[],
  now: Date,
): { order: SchedulableTask[]; blocked: SchedulableTask[] } {
  const ids = new Set(tasks.map((task) => task.id));
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const scores = new Map(tasks.map((task) => [task.id, computePriorityScore(task, tasks, now)]));
  const dependents = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const task of tasks) {
    const deps = (task.dependsOn ?? []).filter((id) => ids.has(id));
    inDegree.set(task.id, deps.length);
    for (const dep of deps) {
      const list = dependents.get(dep) ?? [];
      list.push(task.id);
      dependents.set(dep, list);
    }
  }

  const ready = tasks.filter((task) => inDegree.get(task.id) === 0);
  const order: SchedulableTask[] = [];
  const visited = new Set<string>();

  while (ready.length > 0) {
    ready.sort((a, b) => {
      const diff = scores.get(b.id)! - scores.get(a.id)!;
      return diff !== 0 ? diff : a.dueDate.getTime() - b.dueDate.getTime();
    });

    const next = ready.shift()!;
    order.push(next);
    visited.add(next.id);

    for (const depId of dependents.get(next.id) ?? []) {
      const remaining = (inDegree.get(depId) ?? 0) - 1;
      inDegree.set(depId, remaining);
      if (remaining === 0) ready.push(byId.get(depId)!);
    }
  }

  const blocked = tasks.filter((task) => !visited.has(task.id));
  return { order, blocked };
}

interface ScheduleOneResult {
  blocks: ScheduledBlock[];
  remainingMinutes: number;
}

function scheduleOneTask(
  task: SchedulableTask,
  earliestStart: Date,
  busy: TimeRange[],
  preferences: SchedulingPreferences,
  dailyMinutes: Map<string, number>,
): ScheduleOneResult {
  const blocks: ScheduledBlock[] = [];
  let remaining = task.estimatedMinutes;
  const windows = clipWindows(preferences.availableWindows, earliestStart, task.dueDate);

  if (windows.length === 0 || remaining <= 0) {
    return { blocks, remainingMinutes: remaining };
  }

  const localBusy = [...busy];
  let lastBlockEnd: Date | null = null;
  let guard = 1000;

  while (remaining > 0 && guard-- > 0) {
    const isFinalSliver = remaining <= preferences.minSessionMinutes;
    const minRequired = isFinalSliver ? remaining : preferences.minSessionMinutes;

    const effectiveBusy = lastBlockEnd
      ? [...localBusy, { start: lastBlockEnd, end: addMinutes(lastBlockEnd, preferences.breakMinutes) }]
      : localBusy;

    const slots = findAvailableSlots(windows, effectiveBusy, minRequired);
    if (slots.length === 0) break;

    const slot = slots[0];
    const dayKey = dateKey(slot.start);
    const usedToday = dailyMinutes.get(dayKey) ?? 0;
    const dailyRoom = preferences.maxDailyMinutes - usedToday;

    if (dailyRoom < minRequired) {
      localBusy.push({ start: slot.start, end: endOfUtcDay(slot.start) });
      continue;
    }

    const slotMinutes = Math.floor((slot.end.getTime() - slot.start.getTime()) / 60_000);
    const sessionMinutes = Math.min(remaining, preferences.preferredSessionMinutes, slotMinutes, dailyRoom);

    if (sessionMinutes < minRequired) {
      localBusy.push({ start: slot.start, end: endOfUtcDay(slot.start) });
      continue;
    }

    const blockEnd = addMinutes(slot.start, sessionMinutes);
    blocks.push({ taskId: task.id, start: slot.start, end: blockEnd });
    localBusy.push({ start: slot.start, end: blockEnd });
    dailyMinutes.set(dayKey, usedToday + sessionMinutes);
    lastBlockEnd = blockEnd;
    remaining -= sessionMinutes;
  }

  return { blocks, remainingMinutes: remaining };
}

function clipWindows(windows: TimeRange[], start: Date, end: Date): TimeRange[] {
  const result: TimeRange[] = [];
  for (const window of windows) {
    const clippedStart = window.start > start ? window.start : start;
    const clippedEnd = window.end < end ? window.end : end;
    if (clippedStart < clippedEnd) result.push({ start: clippedStart, end: clippedEnd });
  }
  return result;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** UTC calendar-day key, used consistently across this package for day-bucketing. */
export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Exclusive next-UTC-midnight boundary — used to block out "the rest of this day" without a boundary gap. */
function endOfUtcDay(date: Date): Date {
  const startOfDay = new Date(`${dateKey(date)}T00:00:00.000Z`);
  return new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
}
