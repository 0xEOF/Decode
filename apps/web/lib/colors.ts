import type { FixedEvent } from '@decode/scheduling-engine';
import { COURSES } from './mock-data';
import type { AppTask } from './types';

/**
 * Returns a key into the `--<key>` / `--<key>-bg` CSS custom property pairs
 * defined in app/globals.css (class-1..4, type-work, type-appointment,
 * type-study, type-exam) — used by the Calendar, Today timeline, and Kanban
 * to color-code by course/event type.
 */
export function fixedEventColorKey(event: FixedEvent): string {
  if (event.type === 'class') {
    const courseId = event.id.split('-')[1];
    return COURSES.find((course) => course.id === courseId)?.color ?? 'type-study';
  }
  if (event.type === 'work') return 'type-work';
  if (event.type === 'exam') return 'type-exam';
  return 'type-appointment';
}

export function taskColorKey(task: AppTask): string {
  if (task.type === 'exam') return 'type-exam';
  if (task.courseId) return COURSES.find((course) => course.id === task.courseId)?.color ?? 'type-study';
  return 'type-study';
}

export function colorVar(key: string): string {
  return `var(--${key})`;
}

export function colorBgVar(key: string): string {
  return `var(--${key}-bg)`;
}
