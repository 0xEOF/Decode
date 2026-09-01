'use client';

import { analyze } from '@decode/content-scanner';
import type { AnalysisResult } from '@decode/content-scanner';
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useAppData } from '../../AppDataProvider';
import { formatDuration, formatMonthDay } from '../../../lib/format';
import { mockExtractSyllabus, type SyllabusExtraction } from '../../../lib/mock-extraction';
import type { AppTask } from '../../../lib/types';

type Status = 'idle' | 'extracting' | 'review';

interface UploadSyllabusFlowProps {
  courseId?: string;
  courseCode?: string;
}

/**
 * Stands in for ROADMAP.md §3's pipeline:
 *   Upload -> Extract text -> [LLM extraction] -> [Decode scan] -> Import Review
 * The LLM-extraction step is mocked (see lib/mock-extraction.ts) — that's
 * real backend/LLM work this UI-finesse pass is deliberately deferring. The
 * Decode integrity scan is NOT mocked: it runs the actual
 * `@decode/content-scanner` analyze() against the (fake) extracted document,
 * which does contain one deliberately hidden sentence to demonstrate the
 * scan catching something real.
 */
export default function UploadSyllabusFlow({ courseId, courseCode }: UploadSyllabusFlowProps) {
  const { addTasks } = useAppData();
  const [status, setStatus] = useState<Status>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [extraction, setExtraction] = useState<SyllabusExtraction | null>(null);
  const [scanResult, setScanResult] = useState<AnalysisResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setImportedCount(null);
    setStatus('extracting');
    setTimeout(() => {
      const ext = mockExtractSyllabus(file.name, courseCode);
      const result = analyze({ text: ext.rawText, html: ext.rawHtml });
      setExtraction(ext);
      setScanResult(result);
      setSelectedIds(new Set(ext.events.map((e) => e.id)));
      setStatus('review');
    }, 1100);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    event.target.value = '';
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = () => {
    if (!extraction) return;
    const newTasks: AppTask[] = extraction.events
      .filter((event) => selectedIds.has(event.id))
      .map((event) => ({
        id: `t-${event.id}-${Date.now().toString(36)}`,
        title: event.title,
        type: event.type,
        courseId,
        status: 'BACKLOG',
        dueDate: event.dueDate,
        estimatedMinutes: event.estimatedMinutes,
        priority: event.priority,
        gradeWeight: event.gradeWeight,
      }));
    addTasks(newTasks);
    setImportedCount(newTasks.length);
    setStatus('idle');
    setExtraction(null);
    setScanResult(null);
  };

  const handleCancel = () => {
    setStatus('idle');
    setExtraction(null);
    setScanResult(null);
  };

  if (status === 'review' && extraction && scanResult) {
    return (
      <div className="import-review">
        {scanResult.stats.total > 0 ? (
          <div className="decode-banner decode-banner--warning">
            ⚠ {scanResult.stats.total} hidden/suspicious item{scanResult.stats.total === 1 ? '' : 's'} found in this
            document — review before import.
            <div className="decode-finding-list">
              {scanResult.findings.map((finding) => (
                <div className="decode-finding-row" key={finding.id}>
                  <span>{finding.icon}</span>
                  <div>
                    <strong>{finding.label}</strong>
                    <p>{finding.description}</p>
                    <code>{finding.matchedText.slice(0, 140)}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="decode-banner decode-banner--clean">✓ Decode scan found nothing hidden or suspicious.</div>
        )}

        <p className="import-review-heading">
          We found {extraction.events.length} academic event{extraction.events.length === 1 ? '' : 's'} in{' '}
          {extraction.fileName}
        </p>

        <div className="detail-list">
          {extraction.events.map((event) => (
            <label className="extracted-event-row" key={event.id}>
              <input type="checkbox" checked={selectedIds.has(event.id)} onChange={() => toggleSelected(event.id)} />
              <span className="extracted-event-title">{event.title}</span>
              <span className="extracted-event-meta">
                {event.type} · {formatDuration(event.estimatedMinutes)} · Due {formatMonthDay(event.dueDate)}
                {event.gradeWeight ? ` · ${event.gradeWeight}%` : ''}
              </span>
            </label>
          ))}
        </div>

        <div className="import-actions">
          <button type="button" className="button-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button type="button" className="button-primary" onClick={handleImport} disabled={selectedIds.size === 0}>
            Import Selected ({selectedIds.size})
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className={`upload-dropzone${dragOver ? ' drag-over' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={handleInputChange} />
        {status === 'extracting' ? (
          <p>Extracting deadlines and running the Decode integrity scan…</p>
        ) : (
          <>
            <p>
              <strong>Drop a syllabus here</strong> or click to browse
            </p>
            <p className="upload-hint">PDF or DOCX. This preview simulates extraction — the real LLM pipeline lands with auth/DB (ROADMAP.md §3).</p>
          </>
        )}
      </div>

      {importedCount !== null && (
        <p className="import-success">Imported {importedCount} event{importedCount === 1 ? '' : 's'} into Tasks.</p>
      )}
    </div>
  );
}
