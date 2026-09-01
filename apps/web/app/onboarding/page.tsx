import type { Metadata } from 'next';
import '../app/app.css';
import './onboarding.css';
import OnboardingWizard from './OnboardingWizard';

export const metadata: Metadata = {
  title: 'Set Up Your Semester · Decode',
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
