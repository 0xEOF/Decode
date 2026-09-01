'use client';

import { useState } from 'react';
import { useAppData } from '../../../AppDataProvider';
import { colorVar } from '../../../../lib/colors';
import { formatDuration, formatMeetingDays, formatMonthDay, formatTimeRange12h } from '../../../../lib/format';
import UploadSyllabusFlow from '../../components/UploadSyllabusFlow';

type Tab = 'overview' | 'assignments' | 'exams' | 'documents' | 'ai-policy';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'exams', label: 'Exams' },
  { id: 'documents', label: 'Documents' },
  { id: 'ai-policy', label: 'AI Policy' },
];

export default function CourseDetailView({ courseId }: { courseId: string }) {
  const { courses, tasks } = useAppData();
  const [tab, setTab] = useState<Tab>('overview');

  const course = courses.find((c) => c.id === courseId);
  if (!course) return null;

  const courseTasks = tasks.filter((task) => task.courseId === courseId);
  const assignments = courseTasks.filter((task) => task.type === 'assignment' || task.type === 'reading' || task.type === 'project');
  const exams = courseTasks.filter((task) => task.type === 'exam' || task.type === 'quiz');

  return (
    <div>
      <div className="course-detail-header" style={{ ['--course-color' as string]: colorVar(course.color) }}>
        <div className="course-card-code">{course.code}</div>
        <h1 style={{ margin: '4px 0 0', fontSize: 24, color: 'var(--text-h)' }}>{course.name}</h1>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tab-button${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="detail-list">
          <div className="detail-row">
            <span>Professor</span>
            <span>{course.professor}</span>
          </div>
          <div className="detail-row">
            <span>Meets</span>
            <span>
              {formatMeetingDays(course.meetingDays)} · {formatTimeRange12h(course.startTime, course.endTime)}
            </span>
          </div>
          <div className="detail-row">
            <span>Location</span>
            <span>{course.location}</span>
          </div>
          {course.officeHours && (
            <div className="detail-row">
              <span>Office hours</span>
              <span>{course.officeHours}</span>
            </div>
          )}
        </div>
      )}

      {tab === 'assignments' && (
        <div className="detail-list">
          {assignments.length === 0 && <p className="empty-state">No assignments for this course yet.</p>}
          {assignments.map((task) => (
            <div className="detail-row" key={task.id}>
              <span>{task.title}</span>
              <span>
                {task.status.replace('_', ' ')} · {formatDuration(task.estimatedMinutes)} · Due{' '}
                {formatMonthDay(task.dueDate)}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'exams' && (
        <div className="detail-list">
          {exams.length === 0 && <p className="empty-state">No exams or quizzes scheduled for this course yet.</p>}
          {exams.map((task) => (
            <div className="detail-row" key={task.id}>
              <span>{task.title}</span>
              <span>
                {task.status.replace('_', ' ')} · {task.gradeWeight ? `${task.gradeWeight}% of grade · ` : ''}
                {formatMonthDay(task.dueDate)}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'documents' && <UploadSyllabusFlow courseId={course.id} courseCode={course.code} />}

      {tab === 'ai-policy' && <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>{course.aiPolicy}</p>}
    </div>
  );
}
