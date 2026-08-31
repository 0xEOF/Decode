/**
 * Orchestrates segmentation + detectors into a single AnalysisResult.
 */
import { segmentsFromHtml, segmentsFromPlainText } from './visibility';
import { scanUnicode } from './unicode';
import { scanKeywords } from './keywords';
import type { AIFinding, AnalysisInput, AnalysisResult, AnalysisStats, Finding, Segment } from './types';

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

function findingsForSegment(segment: Segment): Finding[] {
  const findings: Finding[] = [];

  if (segment.hidden && !segment.isStructural) {
    findings.push({
      id: nextId('finding'),
      type: 'hidden',
      severity: 'high',
      icon: '🔴',
      label: 'Hidden Content',
      description: segment.hiddenReasons.length
        ? `Text is hidden (${segment.hiddenReasons.join(', ')}).`
        : 'Text is hidden from view.',
      segmentId: segment.id,
      start: 0,
      end: segment.text.length,
      matchedText: segment.text,
    });
  }

  if (segment.isStructural) return findings;

  for (const match of scanUnicode(segment.text)) {
    findings.push({
      id: nextId('finding'),
      type: 'unicode-invisible',
      severity: 'medium',
      icon: '🟣',
      label: 'Invisible Unicode',
      description: `${match.info.name} detected.`,
      segmentId: segment.id,
      start: match.index,
      end: match.index + match.length,
      matchedText: match.char,
      actsAsSeparator: match.info.actsAsSeparator,
    });
  }

  // Suspicious keywords are only meaningful to report against visible text;
  // hidden segments are already fully covered by the 'hidden' finding above.
  if (!segment.hidden) {
    for (const match of scanKeywords(segment.text)) {
      findings.push(
        match.removable
          ? {
              id: nextId('finding'),
              type: 'covert-instruction',
              severity: 'high',
              icon: '⚠️',
              label: 'Covert Instruction',
              description: `${match.label}. Removed in the clean version.`,
              segmentId: segment.id,
              start: match.index,
              end: match.index + match.length,
              matchedText: match.matchedText,
            }
          : {
              id: nextId('finding'),
              type: 'suspicious-keyword',
              severity: 'low',
              icon: '🟠',
              label: 'Suspicious Content',
              description: `${match.label}.`,
              segmentId: segment.id,
              start: match.index,
              end: match.index + match.length,
              matchedText: match.matchedText,
            },
      );
    }
  }

  return findings;
}

function computeStats(findings: Finding[]): AnalysisStats {
  const stats: AnalysisStats = {
    hidden: 0,
    invisibleUnicode: 0,
    suspiciousKeyword: 0,
    covertInstruction: 0,
    total: findings.length,
  };
  for (const f of findings) {
    if (f.type === 'hidden') stats.hidden += 1;
    else if (f.type === 'unicode-invisible') stats.invisibleUnicode += 1;
    else if (f.type === 'suspicious-keyword') stats.suspiciousKeyword += 1;
    else if (f.type === 'covert-instruction') stats.covertInstruction += 1;
  }
  return stats;
}

export function analyze(input: AnalysisInput): AnalysisResult {
  const segments = input.html && input.html.trim() ? segmentsFromHtml(input.html) : segmentsFromPlainText(input.text);

  const findings = segments.flatMap(findingsForSegment);

  return {
    input,
    segments,
    findings,
    stats: computeStats(findings),
  };
}

/**
 * Concatenates the visible (non-hidden, non-structural) segment text into one
 * blob for the AI deep scan, tracking each segment's [start, end) range in
 * the blob. Hidden segments are excluded — they're
 * already fully handled by the local 'hidden' finding and there's no reason
 * to send content the user can't even see to an external API.
 */
const SEGMENT_SEPARATOR = ' ';

export interface FlattenedRange {
  segmentId: string;
  blobStart: number;
  blobEnd: number;
}

export function flattenVisibleText(segments: Segment[]): { blob: string; ranges: FlattenedRange[] } {
  let blob = '';
  const ranges: FlattenedRange[] = [];
  for (const segment of segments) {
    if (segment.hidden || segment.isStructural) continue;
    const blobStart = blob.length;
    blob += segment.text;
    ranges.push({ segmentId: segment.id, blobStart, blobEnd: blobStart + segment.text.length });
    blob += SEGMENT_SEPARATOR;
  }
  return { blob, ranges };
}

/** Locates a quote inside the flattened blob, requiring it to sit fully within one segment's range. */
function locateQuote(
  blob: string,
  ranges: FlattenedRange[],
  quote: string,
): { segmentId: string; start: number; end: number } | undefined {
  if (!quote) return undefined;
  let fromIndex = 0;
  for (;;) {
    const idx = blob.indexOf(quote, fromIndex);
    if (idx === -1) return undefined;
    const range = ranges.find((r) => idx >= r.blobStart && idx + quote.length <= r.blobEnd);
    if (range) {
      return { segmentId: range.segmentId, start: idx - range.blobStart, end: idx - range.blobStart + quote.length };
    }
    fromIndex = idx + 1;
  }
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Merges AI deep-scan findings (from server/scan.ts, via aiScan.ts) into an
 * existing AnalysisResult. Every quote is re-located in the actual segment
 * text via string search — the model's own notion of position is never
 * trusted — and any AI finding overlapping a finding local detection already
 * produced is dropped so nothing is double-counted or double-highlighted.
 */
export function mergeAIFindings(result: AnalysisResult, aiFindings: AIFinding[]): AnalysisResult {
  const { blob, ranges } = flattenVisibleText(result.segments);
  const merged: Finding[] = [...result.findings];

  for (const aiFinding of aiFindings) {
    const located = locateQuote(blob, ranges, aiFinding.quote);
    if (!located) continue;

    const overlapsExisting = merged.some(
      (f) => f.segmentId === located.segmentId && rangesOverlap(f.start, f.end, located.start, located.end),
    );
    if (overlapsExisting) continue;

    const removable = aiFinding.category === 'covert-instruction';
    merged.push({
      id: nextId('finding'),
      type: removable ? 'covert-instruction' : 'suspicious-keyword',
      severity: removable ? 'high' : 'low',
      icon: removable ? '⚠️' : '🟠',
      label: removable ? 'Covert Instruction' : 'Suspicious Content',
      description: `${aiFinding.reason} (found by AI deep scan)`,
      segmentId: located.segmentId,
      start: located.start,
      end: located.end,
      matchedText: aiFinding.quote,
    });
  }

  return { ...result, findings: merged, stats: computeStats(merged) };
}
