import type { SchedulableTask } from '@decode/scheduling-engine';

export interface Course {
  id: string;
  code: string;
  name: string;
  professor: string;
  /** Keys into the `--class-*` CSS custom properties defined in app/app/app.css. */
  color: string;
  location: string;
  /** 0 = Monday ... 6 = Sunday, matching mock-data.ts's dayOffset convention. */
  meetingDays: number[];
  startTime: string;
  endTime: string;
  officeHours?: string;
  aiPolicy: string;
}

export type TaskType = 'assignment' | 'exam' | 'quiz' | 'project' | 'reading';

export interface AppTask extends SchedulableTask {
  type: TaskType;
  courseId?: string;
  description?: string;
}
