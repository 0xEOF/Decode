'use client';

import type { CSSProperties, DragEvent, MouseEvent } from 'react';
import { useState } from 'react';
import { useAppData } from '../../AppDataProvider';
import { colorBgVar, colorVar, fixedEventColorKey, taskColorKey } from '../../../lib/colors';
import { WEEK_START } from '../../../lib/mock-data';
import { dateKey, formatMonthDay, formatTime, formatWeekdayShort, isSameUtcDay } from '../../../lib/format';
import { mergeAdjacentBlocks } from '../../../lib/schedule';
import TaskFormModal from '../components/TaskFormModal';

const GRID_START_HOUR = 6;
const GRID_END_HOUR = 23;
const HOUR_HEIGHT = 64;
const GRID_HEIGHT = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT;
const SNAP_MINUTES = 15;

type DragPayload =
  | { kind: 'task'; taskId: string; originalStartIso: string }
  | { kind: 'event'; eventId: string };

interface CalendarItem {
  start: Date;
  end: Date;
  title: string;
  colorKey: string;
  /**
   * Present only for scheduled study blocks and personal commitments —
   * what makes them draggable. Classes, work shifts, and exams stay fixed
   * (no `drag`), matching real-world constraints: you can move your gym
   * time, not your lecture.
   */
  drag?: DragPayload;
}

function weekDays(): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(WEEK_START);
    date.setUTCDate(date.getUTCDate() + i);
    return date;
  });
}

function positionStyle(item: CalendarItem): CSSProperties {
  const startMinutes = (item.start.getUTCHours() - GRID_START_HOUR) * 60 + item.start.getUTCMinutes();
  const durationMinutes = Math.max((item.end.getTime() - item.start.getTime()) / 60_000, 1);
  const top = Math.max((startMinutes / 60) * HOUR_HEIGHT, 0);
  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 18);
  return {
    // Inset by 1px so back-to-back blocks never visually touch borders.
    top: top + 1,
    height: Math.max(height - 2, 16),
    background: colorBgVar(item.colorKey),
    borderColor: colorVar(item.colorKey),
    color: colorVar(item.colorKey),
  };
}

const LEGEND: Array<{ label: string; colorKey: string }> = [
  { label: 'Class', colorKey: 'class-1' },
  { label: 'Work', colorKey: 'type-work' },
  { label: 'Personal', colorKey: 'type-appointment' },
  { label: 'Study', colorKey: 'type-study' },
  { label: 'Exam', colorKey: 'type-exam' },
];

export default function CalendarView() {
  const { tasks, fixedEvents, courses, scheduleResult, now, getCourse, moveScheduledBlock, moveFixedEvent } = useAppData();
  const days = weekDays();
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [addTaskDate, setAddTaskDate] = useState<Date | null>(null);

  const mergedBlocks = mergeAdjacentBlocks(scheduleResult.scheduled);

  const itemsByDay = days.map((day) => {
    const events: CalendarItem[] = fixedEvents
      .filter((event) => isSameUtcDay(event.start, day))
      .map((event) => ({
        start: event.start,
        end: event.end,
        title: event.title,
        colorKey: fixedEventColorKey(event, courses),
        // Personal commitments aren't actually fixed — they're just recurring plans the student can move.
        drag: event.type === 'appointment' ? { kind: 'event' as const, eventId: event.id } : undefined,
      }));

    const blocks: CalendarItem[] = mergedBlocks
      .filter((block) => isSameUtcDay(block.start, day))
      .map((block) => {
        const task = tasks.find((t) => t.id === block.taskId);
        const course = task?.courseId ? getCourse(task.courseId) : undefined;
        return {
          start: block.start,
          end: block.end,
          title: task ? `${course ? `${course.code}: ` : ''}${task.title}` : 'Study session',
          colorKey: task ? taskColorKey(task, courses) : 'type-study',
          drag: { kind: 'task' as const, taskId: block.taskId, originalStartIso: block.start.toISOString() },
        };
      });

    return [...events, ...blocks];
  });

  const handleColumnClick = (day: Date) => (event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return; // a block was clicked, not empty space
    setAddTaskDate(day);
  };

  const handleDrop = (day: Date) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOverDay(null);

    const kind = event.dataTransfer.getData('text/x-drag-kind');
    const durationMinutes = Number(event.dataTransfer.getData('text/x-duration-minutes'));
    if (!kind || !durationMinutes) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const rawMinutes = (offsetY / HOUR_HEIGHT) * 60 + GRID_START_HOUR * 60;
    const snappedMinutes = Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;
    const clampedMinutes = Math.min(Math.max(snappedMinutes, GRID_START_HOUR * 60), GRID_END_HOUR * 60 - durationMinutes);

    const start = new Date(day);
    start.setUTCHours(0, clampedMinutes, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60_000);

    if (kind === 'task') {
      const taskId = event.dataTransfer.getData('text/x-task-id');
      const originalStartIso = event.dataTransfer.getData('text/x-original-start');
      if (!taskId || !originalStartIso) return;
      moveScheduledBlock(taskId, originalStartIso, start, end);
    } else if (kind === 'event') {
      const eventId = event.dataTransfer.getData('text/x-event-id');
      if (!eventId) return;
      moveFixedEvent(eventId, start, end);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Calendar</h1>
        <p>
          Week of {formatMonthDay(WEEK_START)} – {formatMonthDay(days[6])}. Drag a study block or personal
          commitment to reschedule it, or click an empty slot to add a task.
        </p>
        {mergedBlocks.length === 0 && !fixedEvents.some((event) => event.type === 'appointment') && (
          <p className="calendar-empty-hint">
            Only study blocks and personal commitments are draggable — classes, work shifts, and exams are fixed.
            There&rsquo;s nothing movable yet: click an empty slot above to add a task, or upload a syllabus from
            Courses.
          </p>
        )}
      </div>

      <div className="calendar-wrap">
        <div className="calendar-grid">
          <div className="calendar-header-cell" />
          {days.map((day) => (
            <div key={day.toISOString()} className={`calendar-header-cell${isSameUtcDay(day, now) ? ' today' : ''}`}>
              {formatWeekdayShort(day)} {formatMonthDay(day)}
            </div>
          ))}

          <div style={{ position: 'relative', height: GRID_HEIGHT }}>
            {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => (
              <div
                key={i}
                className="calendar-hour-cell"
                style={{ position: 'absolute', top: i * HOUR_HEIGHT, right: 0 }}
              >
                {formatTime(new Date(Date.UTC(2000, 0, 1, GRID_START_HOUR + i)))}
              </div>
            ))}
          </div>

          {days.map((day, dayIndex) => (
            <div
              key={day.toISOString()}
              className={`calendar-day-column${dragOverDay === dateKey(day) ? ' drag-over' : ''}`}
              style={{ height: GRID_HEIGHT, ['--hour-height' as string]: `${HOUR_HEIGHT}px` }}
              onClick={handleColumnClick(day)}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverDay(dateKey(day));
              }}
              onDragLeave={() => setDragOverDay((current) => (current === dateKey(day) ? null : current))}
              onDrop={handleDrop(day)}
            >
              {itemsByDay[dayIndex].map((item, index) => (
                <div
                  className={`calendar-block${item.drag ? ' draggable' : ''}`}
                  key={index}
                  style={positionStyle(item)}
                  draggable={Boolean(item.drag)}
                  onClick={(event) => event.stopPropagation()}
                  onDragStart={(event) => {
                    if (!item.drag) return;
                    event.dataTransfer.setData('text/x-drag-kind', item.drag.kind);
                    if (item.drag.kind === 'task') {
                      event.dataTransfer.setData('text/x-task-id', item.drag.taskId);
                      event.dataTransfer.setData('text/x-original-start', item.drag.originalStartIso);
                    } else {
                      event.dataTransfer.setData('text/x-event-id', item.drag.eventId);
                    }
                    event.dataTransfer.setData(
                      'text/x-duration-minutes',
                      String((item.end.getTime() - item.start.getTime()) / 60_000),
                    );
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                >
                  <strong>{item.title}</strong>
                  {formatTime(item.start)}–{formatTime(item.end)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="calendar-legend">
        {LEGEND.map((item) => (
          <span className="calendar-legend-item" key={item.colorKey}>
            <span className="type-dot" style={{ background: colorVar(item.colorKey) }} />
            {item.label}
          </span>
        ))}
      </div>

      <TaskFormModal
        key={addTaskDate ? addTaskDate.toISOString() : 'closed'}
        open={addTaskDate !== null}
        onClose={() => setAddTaskDate(null)}
        defaultDueDate={addTaskDate ?? undefined}
      />
    </div>
  );
}
