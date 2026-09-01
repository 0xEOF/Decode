import { computeWorkload, scheduleTasks } from '@decode/scheduling-engine';
import type { ScheduledBlock } from '@decode/scheduling-engine';
import type { AppTask } from './types';
import { FIXED_EVENTS, MOCK_NOW, PREFERENCES } from './mock-data';

/**
 * A day counts as "overloaded" once fixed commitments + study time cross
 * this many minutes — deliberately more generous than
 * `PREFERENCES.maxDailyMinutes` (which only caps newly-scheduled study
 * time). Reusing that smaller number here would flag almost every day the
 * scheduler fills to its study cap, even a perfectly normal one — see the
 * distinction workload.ts's own doc comment calls out.
 */
const MAX_TOTAL_MINUTES_PER_DAY = 600; // 10 waking hours of commitments + study

/**
 * Runs the real `@decode/scheduling-engine` against `tasks` (and the fixed
 * mock calendar). Called fresh whenever task state changes — e.g. a Kanban
 * status change — so the computed schedule always reflects current state,
 * matching ROADMAP.md §10's "completing a task triggers a recalculation."
 */
export function computeSchedule(tasks: AppTask[]) {
  const scheduleResult = scheduleTasks(tasks, FIXED_EVENTS, PREFERENCES, MOCK_NOW);
  const workload = computeWorkload(FIXED_EVENTS, scheduleResult.scheduled, MAX_TOTAL_MINUTES_PER_DAY);
  return { scheduleResult, workload };
}

/**
 * Presentation-only merge: the engine legitimately splits one task into
 * several short blocks separated by `breakMinutes` (see scheduler.ts). On a
 * calendar/timeline that reads as a wall of illegible slivers, so blocks for
 * the same task less than 20 minutes apart are drawn as one bar. This never
 * touches `ScheduleResult` itself — only what these two views render.
 */
export function mergeAdjacentBlocks(blocks: ScheduledBlock[]): ScheduledBlock[] {
  const byTask = new Map<string, ScheduledBlock[]>();
  for (const block of blocks) {
    const list = byTask.get(block.taskId) ?? [];
    list.push(block);
    byTask.set(block.taskId, list);
  }

  const merged: ScheduledBlock[] = [];
  for (const list of byTask.values()) {
    const sorted = [...list].sort((a, b) => a.start.getTime() - b.start.getTime());
    let current: ScheduledBlock = { ...sorted[0] };

    for (const next of sorted.slice(1)) {
      const gapMinutes = (next.start.getTime() - current.end.getTime()) / 60_000;
      if (gapMinutes <= 20) {
        current = { ...current, end: next.end };
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    merged.push(current);
  }

  return merged.sort((a, b) => a.start.getTime() - b.start.getTime());
}
