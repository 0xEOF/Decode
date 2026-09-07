import { fixedEvents, getDb } from '@decode/db';
import { getAuthedUser } from '../../../lib/api-auth';
import { fixedEventRowToFixedEvent } from '../../../lib/db-mappers';

export const runtime = 'nodejs';

/** Adds one personal commitment/appointment for the signed-in user — the persisted counterpart to AppDataProvider's addFixedEvent(). Only 'appointment' and 'locked' make sense to add ad hoc here; classes/work/exams come from onboarding. */
export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const title = body?.title;
  const type = body?.type;
  const start = body?.start;
  const end = body?.end;
  if (
    typeof title !== 'string' ||
    !title.trim() ||
    (type !== 'appointment' && type !== 'locked') ||
    typeof start !== 'string' ||
    typeof end !== 'string' ||
    Number.isNaN(Date.parse(start)) ||
    Number.isNaN(Date.parse(end))
  ) {
    return Response.json({ error: 'Invalid fixed-event payload.' }, { status: 400 });
  }

  const db = getDb();
  const [row] = await db
    .insert(fixedEvents)
    .values({ userId: user.id, title, type, startAt: new Date(start), endAt: new Date(end) })
    .returning();

  return Response.json({ fixedEvent: fixedEventRowToFixedEvent(row) });
}
