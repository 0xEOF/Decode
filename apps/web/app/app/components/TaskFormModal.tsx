'use client';

import type { TaskStatus } from '@decode/scheduling-engine';
import { useId, useState, type FormEvent } from 'react';
import { useAppData } from '../../AppDataProvider';
import { dateKey } from '../../../lib/format';
import type { AppTask, TaskType } from '../../../lib/types';

const TYPES: TaskType[] = ['assignment', 'exam', 'quiz', 'project', 'reading'];
const STATUSES: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'];

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  defaultStatus?: TaskStatus;
  defaultDueDate?: Date;
}

function newTaskId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 24);
  return `t-${slug || 'task'}-${Date.now().toString(36)}`;
}

/**
 * Callers should pass a `key` that changes with `defaultStatus`/
 * `defaultDueDate` (e.g. keying on the clicked column or calendar day) so
 * React remounts this with fresh initial state each time it opens, rather
 * than reusing a stale instance from a previous open.
 */
export default function TaskFormModal({ open, onClose, defaultStatus, defaultDueDate }: TaskFormModalProps) {
  const { now, courses, addTasks } = useAppData();
  const headingId = useId();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('assignment');
  const [courseId, setCourseId] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus ?? 'TODO');
  const [dueDate, setDueDate] = useState(dateKey(defaultDueDate ?? now));
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [priority, setPriority] = useState(3);
  const [gradeWeight, setGradeWeight] = useState('');

  if (!open) return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;

    const task: AppTask = {
      id: newTaskId(title),
      title: title.trim(),
      type,
      courseId: courseId || undefined,
      status,
      dueDate: new Date(`${dueDate}T23:59:00.000Z`),
      estimatedMinutes: Math.max(estimatedMinutes, 5),
      priority,
      gradeWeight: gradeWeight ? Number(gradeWeight) : undefined,
    };

    addTasks([task]);
    onClose();
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id={headingId}>Add Task</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Title</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
          </label>

          <div className="form-row">
            <label className="form-field">
              <span>Type</span>
              <select value={type} onChange={(e) => setType(e.target.value as TaskType)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Course</span>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">No course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label className="form-field">
              <span>Due date</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </label>

            <label className="form-field">
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label className="form-field">
              <span>Estimated time (min)</span>
              <input
                type="number"
                min={5}
                step={5}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
              />
            </label>

            <label className="form-field">
              <span>Priority (1–5)</span>
              <input
                type="number"
                min={1}
                max={5}
                value={priority}
                onChange={(e) => setPriority(Math.min(5, Math.max(1, Number(e.target.value))))}
              />
            </label>
          </div>

          <label className="form-field">
            <span>Grade weight % (optional)</span>
            <input type="number" min={0} max={100} value={gradeWeight} onChange={(e) => setGradeWeight(e.target.value)} />
          </label>

          <div className="modal-actions">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button-primary">
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
