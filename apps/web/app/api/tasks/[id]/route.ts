import { and, eq } from 'drizzle-orm';
import { getDb, tasks } from '@decode/db';
import { getAuthedUser } from '../../../../lib/api-auth';
import { taskRowToAppTask } from '../../../../lib/db-mappers';

export const runtime = 'nodejs';

const TASK_STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'];

/** Updates a task's status — the persisted counterpart to AppDataProvider's setTaskStatus(). Scoped to the caller's own tasks; a task belonging to someone else 404s rather than leaking whether it exists. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser();
  if (!user) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status;
  if (typeof status !== 'string' || !TASK_STATUSES.includes(status)) {
    return Response.json({ error: 'Invalid status.' }, { status: 400 });
  }

  const db = getDb();
  const [row] = await db
    .update(tasks)
    .set({ status: status as (typeof tasks.$inferInsert)['status'], updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning();

  if (!row) return Response.json({ error: 'Task not found.' }, { status: 404 });
  return Response.json({ task: taskRowToAppTask(row) });
}
