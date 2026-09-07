import { and, eq } from 'drizzle-orm';
import { fixedEvents, getDb } from '@decode/db';
import { getAuthedUser } from '../../../../lib/api-auth';
import { fixedEventRowToFixedEvent } from '../../../../lib/db-mappers';

export const runtime = 'nodejs';

/** Moves one fixed event — the persisted counterpart to AppDataProvider's moveFixedEvent() (dragging a personal commitment on the calendar). Scoped to the caller's own events. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser();
  if (!user) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const start = body?.start;
  const end = body?.end;
  if (typeof start !== 'string' || typeof end !== 'string' || Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
    return Response.json({ error: 'Invalid start/end.' }, { status: 400 });
  }

  const db = getDb();
  const [row] = await db
    .update(fixedEvents)
    .set({ startAt: new Date(start), endAt: new Date(end), updatedAt: new Date() })
    .where(and(eq(fixedEvents.id, id), eq(fixedEvents.userId, user.id)))
    .returning();

  if (!row) return Response.json({ error: 'Event not found.' }, { status: 404 });
  return Response.json({ fixedEvent: fixedEventRowToFixedEvent(row) });
}
