'use client';

import { computePriorityScore } from '@decode/scheduling-engine';
import Link from 'next/link';
import { useAppData } from '../../AppDataProvider';
import { colorVar, fixedEventColorKey, taskColorKey } from '../../../lib/colors';
import { daysUntil, formatDuration, formatTime, formatWeekday, isSameUtcDay } from '../../../lib/format';
import { mergeAdjacentBlocks } from '../../../lib/schedule';

interface TimelineItem {
  start: Date;
  end: Date;
  title: string;
  meta: string;
  colorKey: string;
}

export default function TodayView() {
  const { studentName, tasks, fixedEvents, courses, scheduleResult, workload, now, getCourse } = useAppData();

  const todaysEvents: TimelineItem[] = fixedEvents
    .filter((event) => isSameUtcDay(event.start, now))
    .map((event) => ({
      start: event.start,
      end: event.end,
      title: event.title,
      meta: event.type === 'class' ? 'Class' : event.type === 'work' ? 'Work' : 'Personal',
      colorKey: fixedEventColorKey(event, courses),
    }));

  const todaysBlocks: TimelineItem[] = mergeAdjacentBlocks(scheduleResult.scheduled)
    .filter((block) => isSameUtcDay(block.start, now))
    .map((block) => {
      const task = tasks.find((t) => t.id === block.taskId);
      const course = task?.courseId ? getCourse(task.courseId) : undefined;
      return {
        start: block.start,
        end: block.end,
        title: task ? task.title : 'Study session',
        meta: course ? `${course.code} — Study` : 'Study',
        colorKey: task ? taskColorKey(task, courses) : 'type-study',
      };
    });

  const timeline = [...todaysEvents, ...todaysBlocks].sort((a, b) => a.start.getTime() - b.start.getTime());

  const activeTasks = tasks.filter((task) => task.status !== 'DONE');
  const topTask = [...activeTasks].sort(
    (a, b) => computePriorityScore(b, activeTasks, now) - computePriorityScore(a, activeTasks, now),
  )[0];
  const topTaskDays = topTask ? daysUntil(topTask.dueDate, now) : null;

  const todayWorkload = workload.find((day) => isSameUtcDay(new Date(`${day.date}T00:00:00.000Z`), now));
  const overloadedDays = workload.filter((day) => day.isOverloaded);

  return (
    <div>
      <h1 className="today-greeting">Good morning, {studentName}</h1>
      <p className="today-date">{formatWeekday(now)} — this is a preview built from sample semester data</p>

      <div className="today-layout">
        <div className="timeline">
          {timeline.length === 0 ? (
            <p className="timeline-empty">Nothing scheduled today.</p>
          ) : (
            timeline.map((item, index) => (
              <div className="timeline-item" key={index}>
                <div className="timeline-time">{formatTime(item.start)}</div>
                <div className="timeline-body">
                  <p className="timeline-title">
                    <span className="type-dot" style={{ background: colorVar(item.colorKey) }} />
                    {item.title}
                  </p>
                  <p className="timeline-meta">
                    {item.meta} · {formatTime(item.start)}–{formatTime(item.end)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          {topTask && (
            <div className="recommendation-card">
              <h2>AI Recommendation</h2>
              <p>
                Your highest priority right now is <strong>{topTask.title}</strong>. It&rsquo;s{' '}
                {topTaskDays !== null && topTaskDays <= 0
                  ? 'overdue'
                  : `in ${topTaskDays} day${topTaskDays === 1 ? '' : 's'}`}{' '}
                and has about {formatDuration(topTask.estimatedMinutes)} of work scheduled for it.
              </p>
              <Link href="/app/tasks" className="button-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                View in Tasks
              </Link>
            </div>
          )}

          <div className="side-panel">
            <h2>Workload</h2>
            {todayWorkload ? (
              <>
                <div className="overload-row">
                  <span>Fixed commitments</span>
                  <span>{formatDuration(todayWorkload.fixedMinutes)}</span>
                </div>
                <div className="overload-row">
                  <span>Study time</span>
                  <span>{formatDuration(todayWorkload.scheduledMinutes)}</span>
                </div>
                <div className="overload-row">
                  <span>Total</span>
                  <span>
                    {formatDuration(todayWorkload.totalMinutes)}
                    {todayWorkload.isOverloaded && <span className="badge" style={{ marginLeft: 8 }}>Overloaded</span>}
                  </span>
                </div>
              </>
            ) : (
              <p className="timeline-meta">Nothing on the books today.</p>
            )}
            {overloadedDays.length > 0 && (
              <p className="timeline-meta" style={{ marginTop: 12 }}>
                {overloadedDays.length} day{overloadedDays.length === 1 ? '' : 's'} over your daily cap in the next two
                weeks. See <Link href="/app/calendar">Calendar</Link> for the full picture.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
