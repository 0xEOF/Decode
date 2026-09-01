'use client';

import { useAppData } from '../../AppDataProvider';
import { formatMonthDay } from '../../../lib/format';
import type { AppTask } from '../../../lib/types';

/**
 * There's no dedicated "project" entity in the mock data yet — this groups
 * project-type tasks by their shared "<Project Name> — <subtask>" title
 * prefix, which is the same shape ROADMAP.md §11's assignment→task
 * breakdown produces. Good enough for a UI preview; a real `projects` table
 * is DB-layer work.
 */
function groupProjects(tasks: AppTask[]) {
  const projectTasks = tasks.filter((task) => task.type === 'project');
  const groups = new Map<string, { name: string; courseId?: string; tasks: AppTask[] }>();

  for (const task of projectTasks) {
    const name = task.title.includes(' — ') ? task.title.split(' — ')[0] : task.title;
    const key = `${task.courseId ?? 'none'}:${name}`;
    const group = groups.get(key) ?? { name, courseId: task.courseId, tasks: [] };
    group.tasks.push(task);
    groups.set(key, group);
  }

  return [...groups.values()];
}

export default function ProjectsView() {
  const { tasks, getCourse } = useAppData();
  const projects = groupProjects(tasks);

  return (
    <div>
      <div className="page-header">
        <h1>Projects</h1>
        <p>Multi-step academic work, grouped from their subtasks.</p>
      </div>

      {projects.length === 0 && <p className="empty-state">No projects yet.</p>}

      {projects.map((project) => {
        const done = project.tasks.filter((task) => task.status === 'DONE').length;
        const progress = Math.round((done / project.tasks.length) * 100);
        const course = getCourse(project.courseId);
        const nextDue = [...project.tasks].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

        return (
          <div className="project-card" key={`${project.courseId}:${project.name}`}>
            <h3>
              {project.name}
              {course && <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}> · {course.code}</span>}
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>
              {done}/{project.tasks.length} subtasks done · Next due {formatMonthDay(nextDue.dueDate)}
            </p>
            <div className="project-progress-track">
              <div className="project-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="project-subtasks">
              {project.tasks.map((task) => (
                <div className={`project-subtask${task.status === 'DONE' ? ' done' : ''}`} key={task.id}>
                  <span>{task.title}</span>
                  <span>{task.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
