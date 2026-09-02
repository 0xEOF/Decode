'use client';

import type { TaskStatus } from '@decode/scheduling-engine';
import { useState, type DragEvent } from 'react';
import { useAppData } from '../../AppDataProvider';
import { colorBgVar, colorVar, taskColorKey } from '../../../lib/colors';
import { formatDuration, formatMonthDay } from '../../../lib/format';
import type { AppTask, Course } from '../../../lib/types';
import TaskFormModal from '../components/TaskFormModal';

const COLUMNS: Array<{ status: TaskStatus; label: string }> = [
  { status: 'BACKLOG', label: 'Backlog' },
  { status: 'TODO', label: 'To Do' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'DONE', label: 'Done' },
];

export default function TasksView() {
  const { tasks, courses, setTaskStatus, getCourse, now } = useAppData();
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [addingToColumn, setAddingToColumn] = useState<TaskStatus | null>(null);

  const handleDrop = (event: DragEvent<HTMLDivElement>, status: TaskStatus) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain');
    if (taskId) setTaskStatus(taskId, status);
    setDragOverColumn(null);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Tasks</h1>
        <p>Drag a card to change its status. Moving a task off Done re-runs the scheduling engine.</p>
      </div>

      <div className="kanban-board">
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);
          return (
            <div
              key={column.status}
              className={`kanban-column${dragOverColumn === column.status ? ' drag-over' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverColumn(column.status);
              }}
              onDragLeave={() => setDragOverColumn((current) => (current === column.status ? null : current))}
              onDrop={(event) => handleDrop(event, column.status)}
            >
              <div className="kanban-column-header">
                <span>{column.label}</span>
                <span className="kanban-count">{columnTasks.length}</span>
              </div>

              {columnTasks.map((task) => (
                <TaskCard key={task.id} task={task} now={now} courses={courses} courseCode={getCourse(task.courseId)?.code} />
              ))}

              <button type="button" className="add-task-button" onClick={() => setAddingToColumn(column.status)}>
                + Add Task
              </button>
            </div>
          );
        })}
      </div>

      <TaskFormModal
        key={addingToColumn ?? 'closed'}
        open={addingToColumn !== null}
        onClose={() => setAddingToColumn(null)}
        defaultStatus={addingToColumn ?? undefined}
      />
    </div>
  );
}

function TaskCard({ task, now, courses, courseCode }: { task: AppTask; now: Date; courses: Course[]; courseCode?: string }) {
  const colorKey = taskColorKey(task, courses);
  const overdue = task.status !== 'DONE' && task.dueDate < now;

  return (
    <div
      className="task-card"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', task.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
    >
      <p className="task-card-title">{task.title}</p>
      <div className="task-card-meta">
        <span className="type-badge" style={{ background: colorBgVar(colorKey), color: colorVar(colorKey) }}>
          {task.type}
        </span>
        {courseCode && <span>{courseCode}</span>}
        <span>{formatDuration(task.estimatedMinutes)}</span>
        <span style={overdue ? { color: 'var(--hidden)', fontWeight: 600 } : undefined}>
          {overdue ? 'Overdue' : `Due ${formatMonthDay(task.dueDate)}`}
        </span>
      </div>
    </div>
  );
}
