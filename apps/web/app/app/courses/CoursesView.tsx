'use client';

import Link from 'next/link';
import { useAppData } from '../AppDataProvider';
import { colorVar } from '../../../lib/colors';
import { formatMeetingDays, formatTimeRange12h } from '../../../lib/format';

export default function CoursesView() {
  const { courses, tasks } = useAppData();

  return (
    <div>
      <div className="page-header">
        <h1>Courses</h1>
        <p>This semester&rsquo;s courses, from sample onboarding data.</p>
      </div>

      <div className="course-grid">
        {courses.map((course) => {
          const openTasks = tasks.filter((task) => task.courseId === course.id && task.status !== 'DONE').length;
          return (
            <Link
              key={course.id}
              href={`/app/courses/${course.id}`}
              className="course-card"
              style={{ ['--course-color' as string]: colorVar(course.color) }}
            >
              <div className="course-card-code">{course.code}</div>
              <div className="course-card-name">{course.name}</div>
              <div className="course-card-meta">
                {course.professor}
                <br />
                {formatMeetingDays(course.meetingDays)} · {formatTimeRange12h(course.startTime, course.endTime)}
                <br />
                {openTasks} open task{openTasks === 1 ? '' : 's'}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
