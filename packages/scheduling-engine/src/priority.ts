import type { SchedulableTask } from './types';

const DEADLINE_HORIZON_DAYS = 14;
const OVERDUE_PENALTY = 50;
const DEPENDENCY_BONUS_PER_DEPENDENT = 15;
const DEPENDENCY_BONUS_CAP = 45;

/**
 * Implements ROADMAP.md §5's priority formula:
 *   priority = deadline_urgency + grade_weight + task_priority
 *              + dependency_weight + overdue_penalty
 *
 * This is a relative ranking score, not normalized to a fixed range — it
 * is only meaningful when comparing tasks scored in the same run, with the
 * same `now` and the same `allTasks` set (dependency_weight depends on
 * which other tasks are present).
 */
export function computePriorityScore(task: SchedulableTask, allTasks: SchedulableTask[], now: Date): number {
  return (
    deadlineUrgency(task, now) +
    gradeWeight(task) +
    taskPriority(task) +
    dependencyWeight(task, allTasks) +
    overduePenalty(task, now)
  );
}

function deadlineUrgency(task: SchedulableTask, now: Date): number {
  const daysUntilDue = (task.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  const score = 100 - (daysUntilDue / DEADLINE_HORIZON_DAYS) * 100;
  return clamp(score, 0, 100);
}

function gradeWeight(task: SchedulableTask): number {
  return clamp(task.gradeWeight ?? 0, 0, 100);
}

function taskPriority(task: SchedulableTask): number {
  return clamp(task.priority, 1, 5) * 20;
}

function dependencyWeight(task: SchedulableTask, allTasks: SchedulableTask[]): number {
  const dependents = allTasks.filter((other) => other.dependsOn?.includes(task.id));
  return Math.min(dependents.length * DEPENDENCY_BONUS_PER_DEPENDENT, DEPENDENCY_BONUS_CAP);
}

function overduePenalty(task: SchedulableTask, now: Date): number {
  return task.status !== 'DONE' && task.dueDate < now ? OVERDUE_PENALTY : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
