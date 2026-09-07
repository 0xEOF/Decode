import { eq } from 'drizzle-orm';
import { courses, fixedEvents, getDb, profiles, tasks, userPreferences } from '@decode/db';
import { getAuthedUser } from '../../../lib/api-auth';
import { dateAt, materializeRecurringEvents, startOfWeek } from '../../../lib/scheduling-windows';
import { HORIZON_DAYS } from '../../../lib/mock-data';

export const runtime = 'nodejs';

interface CourseInput {
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

interface RecurringCommitmentInput {
  title: string;
  type: 'work' | 'appointment';
  days: number[];
  startTime: string;
  endTime: string;
}

interface PreferencesInput {
  earliestTime: string;
  latestTime: string;
  minSessionMinutes: number;
  preferredSessionMinutes: number;
  breakMinutes: number;
  maxDailyMinutes: number;
}

interface TaskInput {
  title: string;
  type: string;
  courseCode?: string;
  description?: string;
  /** Days from today the task is due — resolved against the real current date, not a fixture. */
  dueInDays: number;
  dueTime: string;
  estimatedMinutes: number;
  priority: number;
  gradeWeight?: number;
}

interface OnboardingRequestBody {
  studentName: string;
  school?: string;
  semesterLabel?: string;
  courses: CourseInput[];
  recurringCommitments: RecurringCommitmentInput[];
  preferences: PreferencesInput;
  tasks: TaskInput[];
}

const TASK_TYPES = ['assignment', 'exam', 'quiz', 'project', 'reading'];

function isStringArrayOfNumbers(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'number');
}

function validateBody(body: unknown): OnboardingRequestBody | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;

  if (typeof b.studentName !== 'string' || !b.studentName.trim()) return null;
  if (!Array.isArray(b.courses) || !Array.isArray(b.recurringCommitments) || !Array.isArray(b.tasks)) return null;
  if (!b.preferences || typeof b.preferences !== 'object') return null;

  for (const c of b.courses) {
    if (typeof c !== 'object' || c === null) return null;
    const course = c as Record<string, unknown>;
    if (typeof course.code !== 'string' || typeof course.name !== 'string' || typeof course.color !== 'string') return null;
    if (!isStringArrayOfNumbers(course.meetingDays)) return null;
    if (typeof course.startTime !== 'string' || typeof course.endTime !== 'string') return null;
  }

  for (const rc of b.recurringCommitments) {
    if (typeof rc !== 'object' || rc === null) return null;
    const commitment = rc as Record<string, unknown>;
    if (typeof commitment.title !== 'string') return null;
    if (commitment.type !== 'work' && commitment.type !== 'appointment') return null;
    if (!isStringArrayOfNumbers(commitment.days)) return null;
    if (typeof commitment.startTime !== 'string' || typeof commitment.endTime !== 'string') return null;
  }

  for (const t of b.tasks) {
    if (typeof t !== 'object' || t === null) return null;
    const task = t as Record<string, unknown>;
    if (typeof task.title !== 'string' || !TASK_TYPES.includes(task.type as string)) return null;
    if (typeof task.dueInDays !== 'number' || typeof task.dueTime !== 'string') return null;
    if (typeof task.estimatedMinutes !== 'number' || typeof task.priority !== 'number') return null;
  }

  const prefs = b.preferences as Record<string, unknown>;
  if (
    typeof prefs.earliestTime !== 'string' ||
    typeof prefs.latestTime !== 'string' ||
    typeof prefs.minSessionMinutes !== 'number' ||
    typeof prefs.preferredSessionMinutes !== 'number' ||
    typeof prefs.breakMinutes !== 'number' ||
    typeof prefs.maxDailyMinutes !== 'number'
  ) {
    return null;
  }

  return body as OnboardingRequestBody;
}

export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const body = validateBody(rawBody);
  if (!body) {
    return Response.json({ error: 'Invalid onboarding payload.' }, { status: 400 });
  }

  const db = getDb();
  const weekStart = startOfWeek(new Date());

  await db.transaction(async (tx) => {
    const insertedCourses = body.courses.length
      ? await tx
          .insert(courses)
          .values(
            body.courses.map((c) => ({
              userId: user.id,
              code: c.code,
              name: c.name,
              professor: c.professor,
              color: c.color,
              location: c.location,
              meetingDays: c.meetingDays,
              startTime: c.startTime,
              endTime: c.endTime,
              officeHours: c.officeHours,
              aiPolicy: c.aiPolicy,
            })),
          )
          .returning()
      : [];

    const courseIdByCode = new Map(insertedCourses.map((c) => [c.code, c.id]));

    const classEventRows = insertedCourses.flatMap((course) =>
      materializeRecurringEvents(weekStart, HORIZON_DAYS, [
        {
          idPrefix: 'class',
          title: `${course.code} — Class`,
          type: 'class',
          days: course.meetingDays,
          startTime: course.startTime,
          endTime: course.endTime,
        },
      ]).map((instance) => ({
        userId: user.id,
        courseId: course.id,
        title: instance.title,
        type: 'class' as (typeof fixedEvents.$inferInsert)['type'],
        startAt: instance.start,
        endAt: instance.end,
      })),
    );

    const commitmentEventRows = materializeRecurringEvents(
      weekStart,
      HORIZON_DAYS,
      body.recurringCommitments.map((c, i) => ({
        idPrefix: `commitment-${i}`,
        title: c.title,
        type: c.type,
        days: c.days,
        startTime: c.startTime,
        endTime: c.endTime,
      })),
    ).map((instance) => ({
      userId: user.id,
      courseId: null,
      title: instance.title,
      type: instance.type,
      startAt: instance.start,
      endAt: instance.end,
    }));

    const allEventRows = [...classEventRows, ...commitmentEventRows];
    if (allEventRows.length) {
      await tx.insert(fixedEvents).values(allEventRows);
    }

    if (body.tasks.length) {
      await tx.insert(tasks).values(
        body.tasks.map((t) => ({
          userId: user.id,
          courseId: t.courseCode ? (courseIdByCode.get(t.courseCode) ?? null) : null,
          title: t.title,
          description: t.description,
          type: t.type as (typeof tasks.$inferInsert)['type'],
          dueDate: dateAt(weekStart, t.dueInDays, t.dueTime),
          estimatedMinutes: t.estimatedMinutes,
          priority: t.priority,
          gradeWeight: t.gradeWeight,
        })),
      );
    }

    await tx
      .insert(userPreferences)
      .values({
        userId: user.id,
        earliestTime: body.preferences.earliestTime,
        latestTime: body.preferences.latestTime,
        minSessionMinutes: body.preferences.minSessionMinutes,
        preferredSessionMinutes: body.preferences.preferredSessionMinutes,
        breakMinutes: body.preferences.breakMinutes,
        maxDailyMinutes: body.preferences.maxDailyMinutes,
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          earliestTime: body.preferences.earliestTime,
          latestTime: body.preferences.latestTime,
          minSessionMinutes: body.preferences.minSessionMinutes,
          preferredSessionMinutes: body.preferences.preferredSessionMinutes,
          breakMinutes: body.preferences.breakMinutes,
          maxDailyMinutes: body.preferences.maxDailyMinutes,
          updatedAt: new Date(),
        },
      });

    await tx
      .update(profiles)
      .set({
        studentName: body.studentName,
        school: body.school,
        semesterLabel: body.semesterLabel,
        onboarded: true,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, user.id));
  });

  return Response.json({ ok: true });
}
