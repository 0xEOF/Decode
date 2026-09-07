import { eq } from 'drizzle-orm';
import { courses, fixedEvents, getDb, profiles, tasks, userPreferences } from '@decode/db';
import type { SchedulingPreferences } from '@decode/scheduling-engine';
import { getAuthedUser } from '../../../lib/api-auth';
import { courseRowToCourse, fixedEventRowToFixedEvent, taskRowToAppTask } from '../../../lib/db-mappers';
import { buildAvailableWindows, startOfWeek } from '../../../lib/scheduling-windows';
import { HORIZON_DAYS } from '../../../lib/mock-data';

export const runtime = 'nodejs';

/** Fetches the signed-in user's real semester data. Anonymous visitors never call this — they keep using mock-data.ts (see AppDataProvider.tsx). */
export async function GET() {
  const user = await getAuthedUser();
  if (!user) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const db = getDb();

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id));
  if (!profile || !profile.onboarded) {
    return Response.json({ onboarded: false });
  }

  const [courseRows, fixedEventRows, taskRows, preferenceRows] = await Promise.all([
    db.select().from(courses).where(eq(courses.userId, user.id)),
    db.select().from(fixedEvents).where(eq(fixedEvents.userId, user.id)),
    db.select().from(tasks).where(eq(tasks.userId, user.id)),
    db.select().from(userPreferences).where(eq(userPreferences.userId, user.id)),
  ]);

  const prefRow = preferenceRows[0];
  const weekStart = startOfWeek(new Date());
  const preferences: SchedulingPreferences = prefRow
    ? {
        availableWindows: buildAvailableWindows(weekStart, HORIZON_DAYS, prefRow.earliestTime, prefRow.latestTime),
        minSessionMinutes: prefRow.minSessionMinutes,
        preferredSessionMinutes: prefRow.preferredSessionMinutes,
        breakMinutes: prefRow.breakMinutes,
        maxDailyMinutes: prefRow.maxDailyMinutes,
      }
    : {
        availableWindows: buildAvailableWindows(weekStart, HORIZON_DAYS, '07:00', '23:00'),
        minSessionMinutes: 20,
        preferredSessionMinutes: 50,
        breakMinutes: 10,
        maxDailyMinutes: 240,
      };

  return Response.json({
    onboarded: true,
    studentName: profile.studentName,
    courses: courseRows.map(courseRowToCourse),
    fixedEvents: fixedEventRows.map(fixedEventRowToFixedEvent),
    tasks: taskRows.map(taskRowToAppTask),
    preferences,
  });
}
