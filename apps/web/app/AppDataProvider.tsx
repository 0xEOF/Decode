'use client';

import type { FixedEvent, ScheduleResult, SchedulingPreferences, TaskStatus } from '@decode/scheduling-engine';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { computeSchedule } from '../lib/schedule';
import { COURSES, FIXED_EVENTS, MOCK_NOW, PREFERENCES, TASKS } from '../lib/mock-data';
import { randomPreviewName } from '../lib/names';
import { createClient } from '../lib/supabase/client';
import { isSupabaseConfigured } from '../lib/supabase/is-configured';
import { fetchAppData } from '../lib/app-data';
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
  /** Whether there's a real Supabase session — see proxy.ts for why anonymous /app/* browsing stays fully supported regardless. */
  isAuthed: boolean;
  /** True while fetching real data for a signed-in user on first load — distinguishes "no data yet" from "still loading" so pages don't flash an empty state. */
  isLoadingRealData: boolean;
  setTaskStatus: (taskId: string, status: TaskStatus) => void;
  addTasks: (newTasks: AppTask[]) => void;
  addFixedEvent: (event: FixedEvent) => void;
  moveScheduledBlock: (taskId: string, originalStartIso: string, start: Date, end: Date) => void;
  moveFixedEvent: (eventId: string, start: Date, end: Date) => void;
  getCourse: (courseId: string | undefined) => Course | undefined;
  completeOnboarding: (data: OnboardingData) => void;
  /** Re-fetches real data from the server and replaces local state with it — call after a successful submitOnboarding() so subsequent mutations (setTaskStatus, moveFixedEvent) act on real, server-assigned ids rather than the locally-materialized preview ids completeOnboarding used for the immediate optimistic update. */
  refreshFromServer: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

/** taskId -> manual drag override for one of its scheduled blocks, keyed by the block's original ISO start. Presentation-only — see moveScheduledBlock. */
type BlockOverrides = Record<string, { start: Date; end: Date }>;

export function AppDataProvider({ children }: { children: ReactNode }) {
  // Starts as a stable, non-random placeholder so server and client render
  // the same markup on first paint — Math.random() would otherwise pick
  // different names during SSR vs. hydration and trigger a mismatch error.
  // The real random pick (anonymous) or real profile name (signed in)
  // happens client-side only, right after mount — see the effect below.
  const [studentName, setStudentName] = useState('there');
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [fixedEvents, setFixedEvents] = useState<FixedEvent[]>(FIXED_EVENTS);
  const [preferences, setPreferences] = useState<SchedulingPreferences>(PREFERENCES);
  const [tasks, setTasks] = useState<AppTask[]>(TASKS);
  const [onboarded, setOnboarded] = useState(false);
  const [blockOverrides, setBlockOverrides] = useState<BlockOverrides>({});
  const [isAuthed, setIsAuthed] = useState(false);
  const [isLoadingRealData, setIsLoadingRealData] = useState(false);
  const [now, setNow] = useState(MOCK_NOW);

  useEffect(() => {
    // This is the one legitimate exception to "don't setState in an effect":
    // values that must differ between the server-rendered HTML and the
    // client (a random name pick, or real per-user data) can only be
    // assigned after hydration — computing them during render would make
    // server and client output mismatch and React would throw a hydration
    // error. All the setState calls below (inside the nested async
    // function) are that same exception.
    let cancelled = false;

    async function loadRealDataOrPreview() {
      // No Supabase project configured (e.g. local dev before setup) —
      // everyone is anonymous, exactly like before this feature existed.
      if (!isSupabaseConfigured()) {
        setStudentName(randomPreviewName());
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;

        if (!user) {
          setStudentName(randomPreviewName());
          return;
        }

        setIsAuthed(true);
        setIsLoadingRealData(true);
        try {
          const data = await fetchAppData();
          if (cancelled) return;
          if (data.onboarded) {
            setStudentName(data.studentName ?? 'there');
            setCourses(data.courses ?? []);
            setFixedEvents(data.fixedEvents ?? []);
            setTasks(data.tasks ?? []);
            setPreferences(data.preferences ?? PREFERENCES);
            setOnboarded(true);
            setNow(new Date());
          } else {
            const metaName = user.user_metadata?.student_name;
            setStudentName(typeof metaName === 'string' && metaName ? metaName : 'there');
          }
        } finally {
          if (!cancelled) setIsLoadingRealData(false);
        }
      } catch {
        // Keep the app usable (anonymous mock defaults) rather than a broken/empty screen — reloading retries.
        if (cancelled) return;
        setIsAuthed(false);
        setStudentName(randomPreviewName());
      }
    }

    void loadRealDataOrPreview();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshFromServer = async () => {
    setIsLoadingRealData(true);
    try {
      const data = await fetchAppData();
      if (!data.onboarded) return;
      setStudentName(data.studentName ?? 'there');
      setCourses(data.courses ?? []);
      setFixedEvents(data.fixedEvents ?? []);
      setTasks(data.tasks ?? []);
      setPreferences(data.preferences ?? PREFERENCES);
      setOnboarded(true);
      setNow(new Date());
      setBlockOverrides({});
    } finally {
      setIsLoadingRealData(false);
    }
  };

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
    if (isAuthed) {
      fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).catch((err) => console.error('Failed to save task status', err));
    }
  };

  const addTasks = (newTasks: AppTask[]) => {
    // Real persistence only covers adding one task at a time (the Add Task
    // modal) — UploadSyllabusFlow's multi-task import is still mocked
    // end-to-end (ROADMAP.md §3C), so there's nothing real to save yet for
    // that path regardless of auth state.
    setTasks((current) => [...current, ...newTasks]);
    if (isAuthed && newTasks.length === 1) {
      const [task] = newTasks;
      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          type: task.type,
          courseId: task.courseId,
          description: task.description,
          dueDate: task.dueDate.toISOString(),
          estimatedMinutes: task.estimatedMinutes,
          priority: task.priority,
          gradeWeight: task.gradeWeight,
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`Failed to save new task (${res.status}).`);
          const { task: saved } = await res.json();
          // Swap the client-generated id for the server's real one so a
          // later setTaskStatus() on this task actually finds its row.
          setTasks((current) =>
            current.map((t) => (t.id === task.id ? { ...saved, dueDate: new Date(saved.dueDate) } : t)),
          );
        })
        .catch((err) => console.error('Failed to save new task', err));
    }
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
    if (isAuthed) {
      fetch(`/api/fixed-events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: start.toISOString(), end: end.toISOString() }),
      }).catch((err) => console.error('Failed to save moved event', err));
    }
  };

  const getCourse = (courseId: string | undefined) => courses.find((course) => course.id === courseId);

  const completeOnboarding = (data: OnboardingData) => {
    setStudentName(data.studentName || randomPreviewName());
    setCourses(data.courses);
    setFixedEvents(data.fixedEvents);
    setPreferences(data.preferences);
    setTasks(data.tasks);
    setBlockOverrides({});
    setOnboarded(true);
    if (isAuthed) setNow(new Date());
  };

  const value: AppDataContextValue = {
    studentName,
    courses,
    tasks,
    fixedEvents,
    preferences,
    scheduleResult,
    workload,
    now,
    onboarded,
    isAuthed,
    isLoadingRealData,
    setTaskStatus,
    addTasks,
    addFixedEvent,
    moveScheduledBlock,
    moveFixedEvent,
    getCourse,
    completeOnboarding,
    refreshFromServer,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used inside <AppDataProvider>.');
  return context;
}
