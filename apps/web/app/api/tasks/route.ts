import { getDb, tasks } from '@decode/db';
import { getAuthedUser } from '../../../lib/api-auth';
import { taskRowToAppTask } from '../../../lib/db-mappers';

export const runtime = 'nodejs';

const TASK_TYPES = ['assignment', 'exam', 'quiz', 'project', 'reading'];

interface NewTaskBody {
  title: string;
  type: string;
  courseId?: string;
  description?: string;
  dueDate: string; // ISO
  estimatedMinutes: number;
  priority: number;
  gradeWeight?: number;
}

function validate(body: unknown): NewTaskBody | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.title !== 'string' || !b.title.trim()) return null;
  if (!TASK_TYPES.includes(b.type as string)) return null;
  if (typeof b.dueDate !== 'string' || Number.isNaN(Date.parse(b.dueDate))) return null;
  if (typeof b.estimatedMinutes !== 'number' || typeof b.priority !== 'number') return null;
  return b as unknown as NewTaskBody;
}

/** Adds one real task for the signed-in user — the persisted counterpart to AppDataProvider's addTasks(). */
export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  const body = validate(await request.json().catch(() => null));
  if (!body) return Response.json({ error: 'Invalid task payload.' }, { status: 400 });

  const db = getDb();
  const [row] = await db
    .insert(tasks)
    .values({
      userId: user.id,
      courseId: body.courseId,
      title: body.title,
      description: body.description,
      type: body.type as (typeof tasks.$inferInsert)['type'],
      dueDate: new Date(body.dueDate),
      estimatedMinutes: body.estimatedMinutes,
      priority: body.priority,
      gradeWeight: body.gradeWeight,
    })
    .returning();

  return Response.json({ task: taskRowToAppTask(row) });
}
