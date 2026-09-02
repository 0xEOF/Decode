import type { FixedEvent } from '@decode/scheduling-engine';
import type { AppTask, Course } from './types';

/**
 * Returns a key into the `--<key>` / `--<key>-bg` CSS custom property pairs
 * defined in app/globals.css (class-1..4, type-work, type-appointment,
 * type-study, type-exam) — used by the Calendar, Today timeline, and Kanban
 * to color-code by course/event type.
 *
 * Always takes the live `courses` list rather than the static mock-data
 * fixture — course ids/colors are stateful (onboarding, syllabus import can
 * both add courses that don't exist in the fixture). Class events are
 * matched by their `${course.code} — Class` title prefix rather than
 * parsing a course id out of the event's own id string: materializeClassEvents
 * builds that id as `class-${course.id}-${dayOffset}`, and course ids
 * themselves can contain dashes (e.g. manually-added classes get `class-5`),
 * which breaks a naive split on the second dash-delimited token.
 */
export function fixedEventColorKey(event: FixedEvent, courses: Course[]): string {
  if (event.type === 'class') {
    return courses.find((course) => event.title.startsWith(course.code))?.color ?? 'type-study';
  }
  if (event.type === 'work') return 'type-work';
  if (event.type === 'exam') return 'type-exam';
  return 'type-appointment';
}

export function taskColorKey(task: AppTask, courses: Course[]): string {
  if (task.type === 'exam') return 'type-exam';
  if (task.courseId) return courses.find((course) => course.id === task.courseId)?.color ?? 'type-study';
  return 'type-study';
}

export function colorVar(key: string): string {
  return `var(--${key})`;
}

export function colorBgVar(key: string): string {
  return `var(--${key}-bg)`;
}
