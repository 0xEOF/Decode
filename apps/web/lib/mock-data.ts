import type { FixedEvent, SchedulingPreferences } from '@decode/scheduling-engine';
import type { AppTask, Course } from './types';

/**
 * Sample semester data. There is no auth/database yet (see ROADMAP.md §17),
 * so the app UI runs entirely against this fixture so every screen — Today,
 * Calendar, Tasks, Courses — has something real to render and the actual
 * `@decode/scheduling-engine` package computes a real schedule from it. This
 * file is the one thing to delete once real onboarding + Postgres exist.
 */

// A Wednesday, chosen so "3 days until the ECON exam" lands on a Saturday —
// matches the worked example in ROADMAP.md §7.
export const MOCK_NOW = new Date('2026-03-11T13:00:00.000Z');

function startOfWeek(date: Date): Date {
  const utcDay = date.getUTCDay(); // 0 = Sunday
  const mondayOffset = utcDay === 0 ? -6 : 1 - utcDay;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() + mondayOffset);
  return start;
}

export const WEEK_START = startOfWeek(MOCK_NOW);

/** `dayOffset` is 0 = the Monday of MOCK_NOW's week, 1 = Tuesday, ... 13 = the Sunday after next. */
function dateAt(dayOffset: number, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const result = new Date(WEEK_START);
  result.setUTCDate(result.getUTCDate() + dayOffset);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
}

export const COURSES: Course[] = [
  {
    id: 'bio201',
    code: 'BIO 201',
    name: 'Introduction to Biology',
    professor: 'Prof. Chen',
    color: 'class-1',
    location: 'Life Sciences 110',
    meetingDays: [0, 2, 4],
    startTime: '08:00',
    endTime: '09:15',
    officeHours: 'Tue 2:00–3:00 PM, Life Sciences 214',
    aiPolicy:
      'AI tools may be used to clarify concepts or check grammar, but all lab reports and analysis must reflect your own work. Cite any AI assistance used.',
  },
  {
    id: 'cs310',
    code: 'CS 310',
    name: 'Algorithms',
    professor: 'Prof. Patel',
    color: 'class-2',
    location: 'Engineering 204',
    meetingDays: [1, 3],
    startTime: '13:00',
    endTime: '14:30',
    officeHours: 'Wed 3:00–4:30 PM, Engineering 318',
    aiPolicy:
      'AI-assisted debugging is allowed. Submitted problem sets must include a short note on which parts, if any, used AI assistance.',
  },
  {
    id: 'econ201',
    code: 'ECON 201',
    name: 'Macroeconomics',
    professor: 'Prof. Alvarez',
    color: 'class-3',
    location: 'Denny Hall 253',
    meetingDays: [0, 2],
    startTime: '10:30',
    endTime: '11:45',
    officeHours: 'Mon 1:00–2:00 PM, Denny Hall 310',
    aiPolicy: 'No AI tools permitted on exams. AI use on homework is permitted but must be disclosed.',
  },
  {
    id: 'eng102',
    code: 'ENG 102',
    name: 'Academic Writing',
    professor: 'Prof. Okafor',
    color: 'class-4',
    location: 'Mary Gates 241',
    meetingDays: [1, 3],
    startTime: '09:00',
    endTime: '10:15',
    officeHours: 'Thu 11:00 AM–12:00 PM, Mary Gates 118',
    aiPolicy:
      'AI-generated text may not be submitted as your own writing. Brainstorming and outlining with AI is fine — say so in your process notes.',
  },
];

const HORIZON_DAYS = 14;

function materializeClassEvents(): FixedEvent[] {
  const events: FixedEvent[] = [];
  for (const course of COURSES) {
    for (let week = 0; week * 7 < HORIZON_DAYS; week++) {
      for (const day of course.meetingDays) {
        const dayOffset = week * 7 + day;
        if (dayOffset >= HORIZON_DAYS) continue;
        events.push({
          id: `class-${course.id}-${dayOffset}`,
          title: `${course.code} — Class`,
          type: 'class',
          start: dateAt(dayOffset, course.startTime),
          end: dateAt(dayOffset, course.endTime),
        });
      }
    }
  }
  return events;
}

function materializeWorkEvents(): FixedEvent[] {
  const shifts: Array<{ day: number; start: string; end: string }> = [
    { day: 4, start: '15:00', end: '19:00' }, // Friday
    { day: 5, start: '10:00', end: '16:00' }, // Saturday
  ];
  const events: FixedEvent[] = [];
  for (let week = 0; week * 7 < HORIZON_DAYS; week++) {
    for (const shift of shifts) {
      const dayOffset = week * 7 + shift.day;
      if (dayOffset >= HORIZON_DAYS) continue;
      events.push({
        id: `work-${dayOffset}`,
        title: 'Work — Campus Library Circulation Desk',
        type: 'work',
        start: dateAt(dayOffset, shift.start),
        end: dateAt(dayOffset, shift.end),
      });
    }
  }
  return events;
}

function materializePersonalEvents(): FixedEvent[] {
  const events: FixedEvent[] = [];
  for (let week = 0; week * 7 < HORIZON_DAYS; week++) {
    // Mon/Wed only — Friday is a work day (15:00-19:00), so gym skips it to avoid a conflict.
    for (const day of [0, 2]) {
      const dayOffset = week * 7 + day;
      if (dayOffset >= HORIZON_DAYS) continue;
      events.push({
        id: `gym-${dayOffset}`,
        title: 'Gym — IMA',
        type: 'appointment',
        start: dateAt(dayOffset, '17:00'),
        end: dateAt(dayOffset, '18:00'),
      });
    }
  }
  return events;
}

export const FIXED_EVENTS: FixedEvent[] = [
  ...materializeClassEvents(),
  ...materializeWorkEvents(),
  ...materializePersonalEvents(),
].sort((a, b) => a.start.getTime() - b.start.getTime());

export const TASKS: AppTask[] = [
  {
    id: 't-econ-exam2',
    title: 'ECON Exam 2',
    type: 'exam',
    courseId: 'econ201',
    status: 'IN_PROGRESS',
    dueDate: dateAt(5, '10:30'),
    estimatedMinutes: 180,
    priority: 5,
    gradeWeight: 25,
  },
  {
    id: 't-cs-pset4',
    title: 'CS 310 Problem Set 4',
    type: 'assignment',
    courseId: 'cs310',
    status: 'TODO',
    dueDate: dateAt(7, '23:59'),
    estimatedMinutes: 150,
    priority: 4,
    gradeWeight: 10,
  },
  {
    id: 't-bio-lab3',
    title: 'Bio Lab Report 3',
    type: 'assignment',
    courseId: 'bio201',
    status: 'TODO',
    dueDate: dateAt(4, '17:00'),
    estimatedMinutes: 120,
    priority: 3,
    gradeWeight: 8,
  },
  {
    id: 't-eng-outline',
    title: 'Research Paper — Outline',
    type: 'project',
    courseId: 'eng102',
    status: 'BACKLOG',
    dueDate: dateAt(8, '23:59'),
    estimatedMinutes: 60,
    priority: 3,
  },
  {
    id: 't-eng-draft',
    title: 'Research Paper — Draft',
    type: 'project',
    courseId: 'eng102',
    status: 'BACKLOG',
    dueDate: dateAt(10, '23:59'),
    estimatedMinutes: 180,
    priority: 4,
    gradeWeight: 20,
    dependsOn: ['t-eng-outline'],
  },
  {
    id: 't-cs-reading7',
    title: 'CS Reading — Chapter 7',
    type: 'reading',
    courseId: 'cs310',
    status: 'TODO',
    dueDate: dateAt(3, '13:00'),
    estimatedMinutes: 45,
    priority: 2,
  },
  {
    id: 't-econ-pset3',
    title: 'ECON Problem Set 3',
    type: 'assignment',
    courseId: 'econ201',
    status: 'DONE',
    dueDate: dateAt(0, '23:59'),
    estimatedMinutes: 90,
    priority: 3,
    gradeWeight: 5,
  },
  {
    id: 't-bio-quiz2',
    title: 'Bio Quiz 2 — Study',
    type: 'quiz',
    courseId: 'bio201',
    status: 'BACKLOG',
    dueDate: dateAt(9, '08:00'),
    estimatedMinutes: 45,
    priority: 2,
    gradeWeight: 3,
  },
  {
    id: 't-cs-project-setup',
    title: 'CS Group Project — Repo Setup',
    type: 'project',
    courseId: 'cs310',
    status: 'IN_PROGRESS',
    dueDate: dateAt(9, '13:00'),
    estimatedMinutes: 30,
    priority: 2,
    gradeWeight: 15,
  },
  {
    id: 't-eng-discussion8',
    title: 'Discussion Post — Week 8',
    type: 'assignment',
    courseId: 'eng102',
    status: 'TODO',
    dueDate: dateAt(1, '23:59'),
    estimatedMinutes: 20,
    priority: 2,
    gradeWeight: 2,
  },
];

export const PREFERENCES: SchedulingPreferences = {
  availableWindows: Array.from({ length: HORIZON_DAYS }, (_, dayOffset) => ({
    start: dateAt(dayOffset, '07:00'),
    end: dateAt(dayOffset, '23:00'),
  })),
  minSessionMinutes: 20,
  preferredSessionMinutes: 50,
  breakMinutes: 10,
  maxDailyMinutes: 240,
};
