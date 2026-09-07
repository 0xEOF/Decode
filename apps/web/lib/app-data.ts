/**
 * Client-side fetch wrappers for the real (signed-in) persistence layer —
 * app/api/app-data/route.ts and app/api/onboarding/route.ts. Anonymous
 * visitors never call these; see AppDataProvider.tsx.
 */
import type { FixedEvent, SchedulingPreferences } from '@decode/scheduling-engine';
import type { AppTask, Course } from './types';

export class AppDataError extends Error {}

export interface RealAppData {
  onboarded: boolean;
  studentName?: string;
  courses?: Course[];
  fixedEvents?: FixedEvent[];
  tasks?: AppTask[];
  preferences?: SchedulingPreferences;
}

interface RawTimeRange {
  start: string;
  end: string;
}

export async function fetchAppData(signal?: AbortSignal): Promise<RealAppData> {
  const res = await fetch('/api/app-data', { signal });
  if (!res.ok) throw new AppDataError(`Failed to load your data (${res.status}).`);
  const body = await res.json();

  if (!body.onboarded) return { onboarded: false };

  return {
    onboarded: true,
    studentName: body.studentName,
    courses: body.courses,
    fixedEvents: (body.fixedEvents as (Omit<FixedEvent, 'start' | 'end'> & RawTimeRange)[]).map((e) => ({
      ...e,
      start: new Date(e.start),
      end: new Date(e.end),
    })),
    tasks: (body.tasks as (Omit<AppTask, 'dueDate'> & { dueDate: string })[]).map((t) => ({
      ...t,
      dueDate: new Date(t.dueDate),
    })),
    preferences: {
      ...(body.preferences as SchedulingPreferences),
      availableWindows: (body.preferences.availableWindows as RawTimeRange[]).map((w) => ({
        start: new Date(w.start),
        end: new Date(w.end),
      })),
    },
  };
}

export interface OnboardingSubmissionCourse {
  code: string;
  name: string;
  professor?: string;
  color: string;
  location?: string;
  meetingDays: number[];
  startTime: string;
  endTime: string;
  officeHours?: string;
  aiPolicy?: string;
}

export interface OnboardingSubmissionCommitment {
  title: string;
  type: 'work' | 'appointment';
  days: number[];
  startTime: string;
  endTime: string;
}

export interface OnboardingSubmissionTask {
  title: string;
  type: string;
  courseCode?: string;
  description?: string;
  dueInDays: number;
  dueTime: string;
  estimatedMinutes: number;
  priority: number;
  gradeWeight?: number;
}

export interface OnboardingSubmission {
  studentName: string;
  school?: string;
  semesterLabel?: string;
  courses: OnboardingSubmissionCourse[];
  recurringCommitments: OnboardingSubmissionCommitment[];
  preferences: {
    earliestTime: string;
    latestTime: string;
    minSessionMinutes: number;
    preferredSessionMinutes: number;
    breakMinutes: number;
    maxDailyMinutes: number;
  };
  tasks: OnboardingSubmissionTask[];
}

export async function submitOnboarding(payload: OnboardingSubmission): Promise<void> {
  const res = await fetch('/api/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new AppDataError(typeof body?.error === 'string' ? body.error : `Saving your semester failed (${res.status}).`);
  }
}
