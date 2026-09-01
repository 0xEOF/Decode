'use client';

import type { CSSProperties } from 'react';
import { useAppData } from '../AppDataProvider';
import { colorBgVar, colorVar, fixedEventColorKey, taskColorKey } from '../../../lib/colors';
import { WEEK_START } from '../../../lib/mock-data';
import { formatMonthDay, formatTime, formatWeekdayShort, isSameUtcDay } from '../../../lib/format';
import { mergeAdjacentBlocks } from '../../../lib/schedule';

const GRID_START_HOUR = 6;
const GRID_END_HOUR = 23;
const HOUR_HEIGHT = 64;
const GRID_HEIGHT = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT;

interface CalendarItem {
  start: Date;
  end: Date;
  title: string;
  colorKey: string;
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
  const { tasks, fixedEvents, scheduleResult, now, getCourse } = useAppData();
  const days = weekDays();
  const weekEnd = new Date(WEEK_START);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const mergedBlocks = mergeAdjacentBlocks(scheduleResult.scheduled);

  const itemsByDay = days.map((day) => {
    const events: CalendarItem[] = fixedEvents
      .filter((event) => isSameUtcDay(event.start, day))
      .map((event) => ({ start: event.start, end: event.end, title: event.title, colorKey: fixedEventColorKey(event) }));

    const blocks: CalendarItem[] = mergedBlocks
      .filter((block) => isSameUtcDay(block.start, day))
      .map((block) => {
        const task = tasks.find((t) => t.id === block.taskId);
        const course = task?.courseId ? getCourse(task.courseId) : undefined;
        return {
          start: block.start,
          end: block.end,
          title: task ? `${course ? `${course.code}: ` : ''}${task.title}` : 'Study session',
          colorKey: task ? taskColorKey(task) : 'type-study',
        };
      });

    return [...events, ...blocks];
  });

  return (
    <div>
      <div className="page-header">
        <h1>Calendar</h1>
        <p>
          Week of {formatMonthDay(WEEK_START)} – {formatMonthDay(days[6])}
        </p>
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
              className="calendar-day-column"
              style={{ height: GRID_HEIGHT, ['--hour-height' as string]: `${HOUR_HEIGHT}px` }}
            >
              {itemsByDay[dayIndex].map((item, index) => (
                <div className="calendar-block" key={index} style={positionStyle(item)}>
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
    </div>
  );
}
