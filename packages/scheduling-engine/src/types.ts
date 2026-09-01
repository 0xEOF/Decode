/**
 * Deterministic scheduling engine (ROADMAP.md §5). The LLM is never the
 * source of truth for scheduling — this package computes it. It has zero
 * I/O and zero LLM calls: give it plain data, get plain data back.
 *
 * TIMEZONE BOUNDARY (read before wiring this to real data): every `Date`
 * here is treated as an instant in one consistent reference frame — the
 * engine does not know or care what a student's IANA timezone is, does not
 * expand recurrence rules ("every Mon/Wed/Fri"), and does not interpret
 * "8am" as a wall-clock time. The caller is responsible for:
 *   1. Materializing recurring commitments (classes, work shifts) into
 *      concrete FixedEvent instances for the date range being scheduled.
 *   2. Converting the student's local-time preferences (sleep window,
 *      preferred study hours) into concrete `availableWindows` in the same
 *      reference frame as everything else passed in.
 * Do all of that once, in the app/DB layer, using the student's stored
 * timezone — never inside this package.
 */

export interface TimeRange {
  start: Date;
  end: Date;
}

export type FixedEventType = 'class' | 'work' | 'exam' | 'appointment' | 'locked';

/** An already-committed, immovable block of time. The scheduler never assigns work on top of these. */
export interface FixedEvent extends TimeRange {
  id: string;
  title: string;
  type: FixedEventType;
}

export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'DONE';

/** A unit of work the scheduler needs to find time for. */
export interface SchedulableTask {
  id: string;
  title: string;
  courseId?: string;
  status: TaskStatus;
  /** Hard deadline — the task must finish at or before this instant. */
  dueDate: Date;
  /** Total expected effort, in minutes. May be split across multiple sessions. */
  estimatedMinutes: number;
  /** Student-set priority, 1 (lowest) to 5 (highest). */
  priority: number;
  /** 0-100: how much this counts toward the course grade. Omit/0 if ungraded. */
  gradeWeight?: number;
  /** IDs of other tasks in the same scheduling run that must finish first. */
  dependsOn?: string[];
}

export interface SchedulingPreferences {
  /** Concrete windows of time available for scheduling work — see the timezone note above. */
  availableWindows: TimeRange[];
  /** A session shorter than this is never created; a task's last sliver just spills into the next available slot instead. */
  minSessionMinutes: number;
  /** The scheduler tries not to put more than this much of one task in a single sitting. */
  preferredSessionMinutes: number;
  /** Minimum gap the scheduler leaves after a session before it will book the same task again that day. */
  breakMinutes: number;
  /** Hard cap on newly-scheduled task minutes per calendar day (does not count fixed events). */
  maxDailyMinutes: number;
}

/** One scheduled sitting. A task whose estimatedMinutes exceeds one session produces several of these sharing a taskId. */
export interface ScheduledBlock extends TimeRange {
  taskId: string;
}

export interface UnscheduledTask {
  task: SchedulableTask;
  /** Minutes of this task that could not be placed before its deadline. */
  remainingMinutes: number;
  reason: 'no-capacity-before-deadline' | 'unmet-dependency';
}

export interface ScheduleResult {
  scheduled: ScheduledBlock[];
  unscheduled: UnscheduledTask[];
}

/** A candidate slot returned by findAvailableSlots, ranked best-first. */
export interface RankedSlot extends TimeRange {
  /** Higher is better. Not normalized to a fixed range — only meaningful relative to other slots in the same call. */
  score: number;
}

/** Per-calendar-day summary produced by computeWorkload, keyed by UTC "YYYY-MM-DD". */
export interface DayWorkload {
  date: string;
  fixedMinutes: number;
  scheduledMinutes: number;
  totalMinutes: number;
  isOverloaded: boolean;
}
