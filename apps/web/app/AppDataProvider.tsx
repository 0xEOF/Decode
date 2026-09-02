'use client';

import type { FixedEvent, ScheduleResult, SchedulingPreferences, TaskStatus } from '@decode/scheduling-engine';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { computeSchedule } from '../lib/schedule';
import { COURSES, FIXED_EVENTS, MOCK_NOW, PREFERENCES, TASKS } from '../lib/mock-data';
import type { AppTask, Course } from '../lib/types';

export interface OnboardingData {
  studentName: string;
  courses: Course[];
  fixedEvents: FixedEvent[];
  preferences: SchedulingPreferences;
  /** Starter tasks so Calendar/Tasks have something to schedule — and drag — right away, rather than sitting empty until a syllabus is uploaded. */
  tasks: AppTask[];
}

interface AppDataContextValue {
  studentName: string;
  courses: Course[];
  tasks: AppTask[];
  fixedEvents: FixedEvent[];
  preferences: SchedulingPreferences;
  scheduleResult: ScheduleResult;
  workload: ReturnType<typeof computeSchedule>['workload'];
  now: Date;
  onboarded: boolean;
  setTaskStatus: (taskId: string, status: TaskStatus) => void;
  addTasks: (newTasks: AppTask[]) => void;
  addFixedEvent: (event: FixedEvent) => void;
  moveScheduledBlock: (taskId: string, originalStartIso: string, start: Date, end: Date) => void;
  moveFixedEvent: (eventId: string, start: Date, end: Date) => void;
  getCourse: (courseId: string | undefined) => Course | undefined;
  completeOnboarding: (data: OnboardingData) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

/** taskId -> manual drag override for one of its scheduled blocks, keyed by the block's original ISO start. Presentation-only — see moveScheduledBlock. */
type BlockOverrides = Record<string, { start: Date; end: Date }>;

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [studentName, setStudentName] = useState('George');
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [fixedEvents, setFixedEvents] = useState<FixedEvent[]>(FIXED_EVENTS);
  const [preferences, setPreferences] = useState<SchedulingPreferences>(PREFERENCES);
  const [tasks, setTasks] = useState<AppTask[]>(TASKS);
  const [onboarded, setOnboarded] = useState(false);
  const [blockOverrides, setBlockOverrides] = useState<BlockOverrides>({});

  const { scheduleResult: computedResult, workload } = useMemo(
    () => computeSchedule(tasks, fixedEvents, preferences),
    [tasks, fixedEvents, preferences],
  );

  // Apply any manual calendar drag overrides on top of the engine's own output — see moveScheduledBlock's doc comment.
  const scheduleResult: ScheduleResult = useMemo(() => {
    if (Object.keys(blockOverrides).length === 0) return computedResult;
    return {
      ...computedResult,
      scheduled: computedResult.scheduled.map((block) => {
        const override = blockOverrides[`${block.taskId}@${block.start.toISOString()}`];
        return override ? { ...block, start: override.start, end: override.end } : block;
      }),
    };
  }, [computedResult, blockOverrides]);

  const setTaskStatus = (taskId: string, status: TaskStatus) => {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)));
  };

  const addTasks = (newTasks: AppTask[]) => {
    setTasks((current) => [...current, ...newTasks]);
  };

  const addFixedEvent = (event: FixedEvent) => {
    setFixedEvents((current) => [...current, event]);
  };

  /**
   * Calendar drag-and-drop repositions a block visually only — it does not
   * feed back into the deterministic scheduler (that's real engine-
   * integration work for once auth/DB/LLM are wired up). The override is
   * cleared automatically the moment anything changes that recomputes the
   * schedule (task edits, onboarding), since it's keyed off the engine's own
   * original start time for that block.
   */
  const moveScheduledBlock = (taskId: string, originalStartIso: string, start: Date, end: Date) => {
    setBlockOverrides((current) => ({ ...current, [`${taskId}@${originalStartIso}`]: { start, end } }));
  };

  /**
   * Unlike moveScheduledBlock, this really does update the source data —
   * personal commitments (type 'appointment') are a real FixedEvent, not
   * engine output, so moving one changes an actual busy slot the scheduler
   * sees on the next recompute. Classes/work/exams/locked events stay
   * genuinely fixed; only 'appointment' rows are ever passed a drag payload
   * by CalendarView, so this never gets called for the others.
   */
  const moveFixedEvent = (eventId: string, start: Date, end: Date) => {
    setFixedEvents((current) => current.map((event) => (event.id === eventId ? { ...event, start, end } : event)));
  };

  const getCourse = (courseId: string | undefined) => courses.find((course) => course.id === courseId);

  const completeOnboarding = (data: OnboardingData) => {
    setStudentName(data.studentName || 'George');
    setCourses(data.courses);
    setFixedEvents(data.fixedEvents);
    setPreferences(data.preferences);
    setTasks(data.tasks);
    setBlockOverrides({});
    setOnboarded(true);
  };

  const value: AppDataContextValue = {
    studentName,
    courses,
    tasks,
    fixedEvents,
    preferences,
    scheduleResult,
    workload,
    now: MOCK_NOW,
    onboarded,
    setTaskStatus,
    addTasks,
    addFixedEvent,
    moveScheduledBlock,
    moveFixedEvent,
    getCourse,
    completeOnboarding,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used inside <AppDataProvider>.');
  return context;
}
