'use client';

import type { FixedEvent, ScheduleResult, TaskStatus } from '@decode/scheduling-engine';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { computeSchedule } from '../../lib/schedule';
import { COURSES, FIXED_EVENTS, MOCK_NOW, TASKS } from '../../lib/mock-data';
import type { AppTask, Course } from '../../lib/types';

interface AppDataContextValue {
  courses: Course[];
  tasks: AppTask[];
  fixedEvents: FixedEvent[];
  scheduleResult: ScheduleResult;
  workload: ReturnType<typeof computeSchedule>['workload'];
  now: Date;
  setTaskStatus: (taskId: string, status: TaskStatus) => void;
  getCourse: (courseId: string | undefined) => Course | undefined;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<AppTask[]>(TASKS);

  const { scheduleResult, workload } = useMemo(() => computeSchedule(tasks), [tasks]);

  const setTaskStatus = (taskId: string, status: TaskStatus) => {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)));
  };

  const getCourse = (courseId: string | undefined) => COURSES.find((course) => course.id === courseId);

  const value: AppDataContextValue = {
    courses: COURSES,
    tasks,
    fixedEvents: FIXED_EVENTS,
    scheduleResult,
    workload,
    now: MOCK_NOW,
    setTaskStatus,
    getCourse,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used inside <AppDataProvider>.');
  return context;
}
