'use client';

import type { FixedEventType, SchedulingPreferences } from '@decode/scheduling-engine';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { buildAvailableWindows, COURSES, dateAt, materializeClassEvents, materializeRecurringEvents } from '../../lib/mock-data';
import type { AppTask, Course } from '../../lib/types';

interface ClassDraft {
  id: string;
  code: string;
  name: string;
  professor: string;
  location: string;
  days: number[];
  startTime: string;
  endTime: string;
}

interface ShiftDraft {
  id: string;
  title: string;
  days: number[];
  startTime: string;
  endTime: string;
}

let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function emptyClass(): ClassDraft {
  return { id: '', code: '', name: '', professor: '', location: '', days: [], startTime: '09:00', endTime: '10:15' };
}

function emptyShift(): ShiftDraft {
  return { id: '', title: '', days: [], startTime: '09:00', endTime: '17:00' };
}

const DEMO_CLASSES: ClassDraft[] = COURSES.map((c) => ({
  id: c.id,
  code: c.code,
  name: c.name,
  professor: c.professor,
  location: c.location,
  days: c.meetingDays,
  startTime: c.startTime,
  endTime: c.endTime,
}));

const DEMO_WORK: ShiftDraft[] = [
  { id: uid('demo-work'), title: 'Work — Campus Library', days: [4], startTime: '15:00', endTime: '19:00' },
  { id: uid('demo-work'), title: 'Work — Campus Library', days: [5], startTime: '10:00', endTime: '16:00' },
];

const DEMO_PERSONAL: ShiftDraft[] = [{ id: uid('demo-personal'), title: 'Gym', days: [0, 2], startTime: '17:00', endTime: '18:00' }];

const STEP_LABELS = ['Basic Info', 'Classes', 'Work Schedule', 'Personal Commitments', 'Preferences', 'Review'];
const PALETTE = ['class-1', 'class-2', 'class-3', 'class-4'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function DaysPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  return (
    <div className="days-picker">
      {DAY_LABELS.map((label, day) => (
        <button
          type="button"
          key={day}
          className={`day-chip${value.includes(day) ? ' selected' : ''}`}
          onClick={() => onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort())}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ShiftForm({
  draft,
  onChange,
  onAdd,
  placeholder,
}: {
  draft: ShiftDraft;
  onChange: (draft: ShiftDraft) => void;
  onAdd: () => void;
  placeholder: string;
}) {
  return (
    <div className="onboarding-add-form">
      <label className="form-field">
        <span>Title</span>
        <input type="text" value={draft.title} placeholder={placeholder} onChange={(e) => onChange({ ...draft, title: e.target.value })} />
      </label>
      <DaysPicker value={draft.days} onChange={(days) => onChange({ ...draft, days })} />
      <div className="form-row">
        <label className="form-field">
          <span>Start</span>
          <input type="time" value={draft.startTime} onChange={(e) => onChange({ ...draft, startTime: e.target.value })} />
        </label>
        <label className="form-field">
          <span>End</span>
          <input type="time" value={draft.endTime} onChange={(e) => onChange({ ...draft, endTime: e.target.value })} />
        </label>
      </div>
      <button type="button" className="button-secondary" onClick={onAdd}>
        + Add
      </button>
    </div>
  );
}

function ShiftList({ items, onRemove }: { items: ShiftDraft[]; onRemove: (id: string) => void }) {
  if (items.length === 0) return <p className="empty-state">Nothing added yet.</p>;
  return (
    <div className="detail-list">
      {items.map((item) => (
        <div className="detail-row" key={item.id}>
          <span>{item.title}</span>
          <span className="detail-row-actions">
            {item.days.map((d) => DAY_LABELS[d]).join('/')} · {item.startTime}–{item.endTime}
            <button type="button" className="icon-button" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.title}`}>
              ✕
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

export default function OnboardingWizard() {
  const router = useRouter();
  const { completeOnboarding } = useAppData();
  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [semester, setSemester] = useState('Spring 2026');
  const [timezone, setTimezone] = useState('America/Los_Angeles');

  const [classes, setClasses] = useState<ClassDraft[]>([]);
  const [classDraft, setClassDraft] = useState<ClassDraft>(emptyClass());

  const [work, setWork] = useState<ShiftDraft[]>([]);
  const [workDraft, setWorkDraft] = useState<ShiftDraft>(emptyShift());

  const [personal, setPersonal] = useState<ShiftDraft[]>([]);
  const [personalDraft, setPersonalDraft] = useState<ShiftDraft>(emptyShift());

  const [earliest, setEarliest] = useState('07:00');
  const [latest, setLatest] = useState('23:00');
  const [minSession, setMinSession] = useState(20);
  const [preferredSession, setPreferredSession] = useState(50);
  const [breakMinutes, setBreakMinutes] = useState(10);
  const [maxDaily, setMaxDaily] = useState(240);

  const canAddClass = classDraft.code.trim().length > 0 && classDraft.days.length > 0;
  const canAddShift = (draft: ShiftDraft) => draft.title.trim().length > 0 && draft.days.length > 0;

  const addClass = () => {
    if (!canAddClass) return;
    setClasses((current) => [...current, { ...classDraft, id: uid('class') }]);
    setClassDraft(emptyClass());
  };

  const addWork = () => {
    if (!canAddShift(workDraft)) return;
    setWork((current) => [...current, { ...workDraft, id: uid('work') }]);
    setWorkDraft(emptyShift());
  };

  const addPersonal = () => {
    if (!canAddShift(personalDraft)) return;
    setPersonal((current) => [...current, { ...personalDraft, id: uid('personal') }]);
    setPersonalDraft(emptyShift());
  };

  const handleFinish = () => {
    const courses: Course[] = classes.map((c, i) => ({
      id: c.id,
      code: c.code || `Course ${i + 1}`,
      name: c.name || c.code || `Course ${i + 1}`,
      professor: c.professor || 'TBD',
      color: PALETTE[i % PALETTE.length],
      location: c.location || 'TBD',
      meetingDays: c.days,
      startTime: c.startTime,
      endTime: c.endTime,
      aiPolicy: 'Not specified yet — add this once your syllabus is on file.',
    }));

    // A few starter tasks so Calendar/Tasks aren't completely bare right
    // after setup — otherwise there's nothing for the scheduling engine to
    // place, and nothing draggable, until a syllabus gets uploaded.
    const starterTasks: AppTask[] = courses.slice(0, 4).map((course, i) => ({
      id: `starter-${course.id}`,
      title: 'Get oriented',
      type: 'reading',
      courseId: course.id,
      status: 'TODO',
      dueDate: dateAt(Math.min(3 + i * 2, 13), '23:59'),
      estimatedMinutes: 30,
      priority: 2,
    }));

    const fixedEvents = [
      ...materializeClassEvents(courses),
      ...materializeRecurringEvents(
        work.map((w) => ({
          idPrefix: `work-${w.id}`,
          title: w.title,
          type: 'work' as FixedEventType,
          days: w.days,
          startTime: w.startTime,
          endTime: w.endTime,
        })),
      ),
      ...materializeRecurringEvents(
        personal.map((p) => ({
          idPrefix: `personal-${p.id}`,
          title: p.title,
          type: 'appointment' as FixedEventType,
          days: p.days,
          startTime: p.startTime,
          endTime: p.endTime,
        })),
      ),
    ];

    const preferences: SchedulingPreferences = {
      availableWindows: buildAvailableWindows(earliest, latest),
      minSessionMinutes: minSession,
      preferredSessionMinutes: preferredSession,
      breakMinutes,
      maxDailyMinutes: maxDaily,
    };

    completeOnboarding({ studentName: name.trim() || 'there', courses, fixedEvents, preferences, tasks: starterTasks });
    router.push('/app/today');
  };

  const isLastStep = step === STEP_LABELS.length - 1;

  return (
    <div className="onboarding-shell">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {STEP_LABELS.map((label, index) => (
            <div key={label} className={`onboarding-step${index === step ? ' active' : ''}${index < step ? ' done' : ''}`}>
              <span className="onboarding-step-number">{index < step ? '✓' : index + 1}</span>
              {label}
            </div>
          ))}
        </div>

        <div className="onboarding-body">
          {step === 0 && (
            <section>
              <h1>Let&rsquo;s set up your semester</h1>
              <p className="onboarding-subtitle">
                A few basics first — this preview doesn&rsquo;t persist accounts yet (ROADMAP.md §17), so this just
                seeds the app you&rsquo;re about to see.
              </p>
              <label className="form-field">
                <span>Your name</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="George" />
              </label>
              <div className="form-row">
                <label className="form-field">
                  <span>School</span>
                  <input type="text" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="University of Washington" />
                </label>
                <label className="form-field">
                  <span>Semester</span>
                  <input type="text" value={semester} onChange={(e) => setSemester(e.target.value)} />
                </label>
              </div>
              <label className="form-field">
                <span>Timezone (display only for now)</span>
                <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
              </label>
            </section>
          )}

          {step === 1 && (
            <section>
              <h1>Your classes</h1>
              <p className="onboarding-subtitle">
                Baseline for everything else on your schedule (ROADMAP.md §3B). Real syllabus/screenshot upload lands
                once the LLM backend is wired up — add classes by hand here, or try the example semester.
              </p>
              <button type="button" className="button-secondary" onClick={() => setClasses(DEMO_CLASSES)}>
                Use example classes
              </button>

              <div className="onboarding-add-form">
                <div className="form-row">
                  <label className="form-field">
                    <span>Course code</span>
                    <input type="text" value={classDraft.code} onChange={(e) => setClassDraft({ ...classDraft, code: e.target.value })} placeholder="CS 310" />
                  </label>
                  <label className="form-field">
                    <span>Course name</span>
                    <input type="text" value={classDraft.name} onChange={(e) => setClassDraft({ ...classDraft, name: e.target.value })} placeholder="Algorithms" />
                  </label>
                </div>
                <div className="form-row">
                  <label className="form-field">
                    <span>Professor</span>
                    <input type="text" value={classDraft.professor} onChange={(e) => setClassDraft({ ...classDraft, professor: e.target.value })} />
                  </label>
                  <label className="form-field">
                    <span>Location</span>
                    <input type="text" value={classDraft.location} onChange={(e) => setClassDraft({ ...classDraft, location: e.target.value })} />
                  </label>
                </div>
                <DaysPicker value={classDraft.days} onChange={(days) => setClassDraft({ ...classDraft, days })} />
                <div className="form-row">
                  <label className="form-field">
                    <span>Start</span>
                    <input type="time" value={classDraft.startTime} onChange={(e) => setClassDraft({ ...classDraft, startTime: e.target.value })} />
                  </label>
                  <label className="form-field">
                    <span>End</span>
                    <input type="time" value={classDraft.endTime} onChange={(e) => setClassDraft({ ...classDraft, endTime: e.target.value })} />
                  </label>
                </div>
                <button type="button" className="button-secondary" onClick={addClass} disabled={!canAddClass}>
                  + Add Class
                </button>
              </div>

              {classes.length === 0 ? (
                <p className="empty-state">No classes added yet.</p>
              ) : (
                <div className="detail-list">
                  {classes.map((c, i) => (
                    <div className="detail-row" key={c.id}>
                      <span>
                        <span className="type-dot" style={{ background: `var(--${PALETTE[i % PALETTE.length]})` }} />
                        {c.code} {c.name && `— ${c.name}`}
                      </span>
                      <span className="detail-row-actions">
                        {c.days.map((d) => DAY_LABELS[d]).join('/')} · {c.startTime}–{c.endTime}
                        <button type="button" className="icon-button" onClick={() => setClasses(classes.filter((x) => x.id !== c.id))} aria-label={`Remove ${c.code}`}>
                          ✕
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {step === 2 && (
            <section>
              <h1>Work schedule</h1>
              <p className="onboarding-subtitle">Recurring shifts — treated as fixed, unmovable commitments (ROADMAP.md §4).</p>
              <button type="button" className="button-secondary" onClick={() => setWork(DEMO_WORK)}>
                Use example work schedule
              </button>
              <ShiftForm draft={workDraft} onChange={setWorkDraft} onAdd={addWork} placeholder="Campus Library" />
              <ShiftList items={work} onRemove={(id) => setWork(work.filter((w) => w.id !== id))} />
            </section>
          )}

          {step === 3 && (
            <section>
              <h1>Personal commitments</h1>
              <p className="onboarding-subtitle">Gym, clubs, family time, commute — also fixed, so the scheduler works around them.</p>
              <button type="button" className="button-secondary" onClick={() => setPersonal(DEMO_PERSONAL)}>
                Use example commitments
              </button>
              <ShiftForm draft={personalDraft} onChange={setPersonalDraft} onAdd={addPersonal} placeholder="Gym" />
              <ShiftList items={personal} onRemove={(id) => setPersonal(personal.filter((p) => p.id !== id))} />
            </section>
          )}

          {step === 4 && (
            <section>
              <h1>Study preferences</h1>
              <p className="onboarding-subtitle">Feeds directly into the scheduling engine (ROADMAP.md §5) — no LLM involved in using these.</p>
              <div className="form-row">
                <label className="form-field">
                  <span>Earliest study time</span>
                  <input type="time" value={earliest} onChange={(e) => setEarliest(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Latest study time</span>
                  <input type="time" value={latest} onChange={(e) => setLatest(e.target.value)} />
                </label>
              </div>
              <div className="form-row">
                <label className="form-field">
                  <span>Minimum session (min)</span>
                  <input type="number" min={5} step={5} value={minSession} onChange={(e) => setMinSession(Number(e.target.value))} />
                </label>
                <label className="form-field">
                  <span>Preferred session (min)</span>
                  <input type="number" min={5} step={5} value={preferredSession} onChange={(e) => setPreferredSession(Number(e.target.value))} />
                </label>
              </div>
              <div className="form-row">
                <label className="form-field">
                  <span>Break between sessions (min)</span>
                  <input type="number" min={0} step={5} value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} />
                </label>
                <label className="form-field">
                  <span>Max daily study time (min)</span>
                  <input type="number" min={30} step={15} value={maxDaily} onChange={(e) => setMaxDaily(Number(e.target.value))} />
                </label>
              </div>
            </section>
          )}

          {step === 5 && (
            <section>
              <h1>Review</h1>
              <p className="onboarding-subtitle">
                Finishing sets up your app with this, plus one starter task per class so there&rsquo;s something to
                schedule right away — upload a syllabus from Courses for the real deadlines.
              </p>
              <div className="detail-list">
                <div className="detail-row">
                  <span>Student</span>
                  <span>{name || 'there'} {school && `· ${school}`} {semester && `· ${semester}`}</span>
                </div>
                <div className="detail-row">
                  <span>Classes</span>
                  <span>{classes.length}</span>
                </div>
                <div className="detail-row">
                  <span>Work shifts</span>
                  <span>{work.length}</span>
                </div>
                <div className="detail-row">
                  <span>Personal commitments</span>
                  <span>{personal.length}</span>
                </div>
                <div className="detail-row">
                  <span>Study window</span>
                  <span>
                    {earliest}–{latest}, {preferredSession}min sessions, {maxDaily}min/day max
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="onboarding-nav">
          <button type="button" className="button-secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </button>
          {isLastStep ? (
            <button type="button" className="button-primary" onClick={handleFinish}>
              Finish Setup
            </button>
          ) : (
            <button type="button" className="button-primary" onClick={() => setStep((s) => Math.min(STEP_LABELS.length - 1, s + 1))}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
