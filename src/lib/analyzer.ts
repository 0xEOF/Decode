/**
 * Orchestrates segmentation + detectors into a single AnalysisResult.
 */
import { segmentsFromHtml, segmentsFromPlainText } from './visibility';
import { scanUnicode } from './unicode';
import { scanKeywords } from './keywords';
import type { AnalysisInput, AnalysisResult, AnalysisStats, Finding, Segment } from './types';

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
      findings.push({
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
      });
    }
  }

  return findings;
}

function computeStats(findings: Finding[]): AnalysisStats {
  const stats: AnalysisStats = { hidden: 0, invisibleUnicode: 0, suspiciousKeyword: 0, total: findings.length };
  for (const f of findings) {
    if (f.type === 'hidden') stats.hidden += 1;
    else if (f.type === 'unicode-invisible') stats.invisibleUnicode += 1;
    else if (f.type === 'suspicious-keyword') stats.suspiciousKeyword += 1;
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
