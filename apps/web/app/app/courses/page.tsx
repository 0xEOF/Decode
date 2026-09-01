import type { Metadata } from 'next';
import CoursesView from './CoursesView';

export const metadata: Metadata = { title: 'Courses' };

export default function CoursesPage() {
  return <CoursesView />;
}
