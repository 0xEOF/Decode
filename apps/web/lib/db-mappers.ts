/**
 * DB row <-> app-type conversion for the tables that back real (signed-in)
 * app data — see app/api/app-data/route.ts and app/api/onboarding/route.ts.
 * Keeps the Drizzle row shape (nullable columns) out of the rest of the app,
 * which expects exactly the Course/FixedEvent/AppTask shapes mock-data.ts
 * already produces.
 */
import type { courses, fixedEvents, tasks } from '@decode/db';
import type { FixedEvent } from '@decode/scheduling-engine';
import type { AppTask, Course } from './types';

type CourseRow = typeof courses.$inferSelect;
type FixedEventRow = typeof fixedEvents.$inferSelect;
type TaskRow = typeof tasks.$inferSelect;

export function courseRowToCourse(row: CourseRow): Course {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    professor: row.professor ?? '',
    color: row.color,
    location: row.location ?? '',
    meetingDays: row.meetingDays,
    startTime: row.startTime,
    endTime: row.endTime,
    officeHours: row.officeHours ?? undefined,
    aiPolicy: row.aiPolicy ?? '',
  };
}

export function fixedEventRowToFixedEvent(row: FixedEventRow): FixedEvent {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    start: row.startAt,
    end: row.endAt,
  };
}

export function taskRowToAppTask(row: TaskRow): AppTask {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    courseId: row.courseId ?? undefined,
    description: row.description ?? undefined,
    status: row.status,
    dueDate: row.dueDate,
    estimatedMinutes: row.estimatedMinutes,
    priority: row.priority,
    gradeWeight: row.gradeWeight ?? undefined,
    dependsOn: row.dependsOn.length > 0 ? row.dependsOn : undefined,
  };
}
