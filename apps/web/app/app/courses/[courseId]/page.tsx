import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { COURSES } from '../../../../lib/mock-data';
import CourseDetailView from './CourseDetailView';

export function generateStaticParams() {
  return COURSES.map((course) => ({ courseId: course.id }));
}

export async function generateMetadata({ params }: PageProps<'/app/courses/[courseId]'>): Promise<Metadata> {
  const { courseId } = await params;
  const course = COURSES.find((c) => c.id === courseId);
  return { title: course ? course.code : 'Course' };
}

export default async function CourseDetailPage({ params }: PageProps<'/app/courses/[courseId]'>) {
  const { courseId } = await params;
  if (!COURSES.some((course) => course.id === courseId)) notFound();

  return <CourseDetailView courseId={courseId} />;
}
