/**
 * Builds a "clean" version of the analyzed content from the detection
 * results, rather than re-scanning the raw input:
 *   - segments flagged `hidden`            -> removed entirely
 *   - 'unicode-invisible' findings         -> character removed (or turned
 *                                              into a single space, if it sits
 *                                              between two word characters and
 *                                              was acting as a separator)
 *   - 'suspicious-keyword' findings        -> left untouched; a keyword being
 *                                              suspicious is not a reason to
 *                                              delete visible content
 */
import { CLEANABLE_FINDINGS } from './types';
import type { AnalysisResult, Finding } from './types';

function isWordChar(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[\p{L}\p{N}]/u.test(ch);
}

function cleanSegmentText(text: string, findings: Finding[]): string {
  if (findings.length === 0) return text;

  const sorted = [...findings].sort((a, b) => a.start - b.start);
  let result = '';
  let cursor = 0;

  for (const finding of sorted) {
    if (finding.start < cursor) continue; // overlapping, already covered
    result += text.slice(cursor, finding.start);

    const before = result.length > 0 ? result[result.length - 1] : undefined;
    const after = text[finding.end];
    if (finding.actsAsSeparator && isWordChar(before) && isWordChar(after)) {
      result += ' ';
    }

    cursor = finding.end;
  }

  result += text.slice(cursor);
  return result;
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .trim();
}

export function createCleanVersion(result: AnalysisResult): string {
  const cleanableFindingsBySegment = new Map<string, Finding[]>();
  for (const finding of result.findings) {
    if (!CLEANABLE_FINDINGS.includes(finding.type) || finding.type === 'hidden') continue;
    const list = cleanableFindingsBySegment.get(finding.segmentId) ?? [];
    list.push(finding);
    cleanableFindingsBySegment.set(finding.segmentId, list);
  }

  const pieces: string[] = [];
  for (const segment of result.segments) {
    if (segment.hidden) continue; // whole segment was objectively hidden from the user
    if (segment.isStructural) {
      pieces.push(segment.text);
      continue;
    }
    const findings = cleanableFindingsBySegment.get(segment.id) ?? [];
    pieces.push(cleanSegmentText(segment.text, findings));
  }

  return normalizeWhitespace(pieces.join(''));
}
