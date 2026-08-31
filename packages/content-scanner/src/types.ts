/**
 * Shared types for the Hidden Text & Content Scanner.
 */

/** A contiguous run of text produced while walking the input (plain text or parsed HTML). */
export interface Segment {
  id: string;
  text: string;
  /** True if this segment is not visible to a human reading the rendered content. */
  hidden: boolean;
  /** Human-readable reasons this segment was judged hidden (empty when not hidden). */
  hiddenReasons: string[];
  /** True for segments that only exist to preserve structural spacing (paragraph/line breaks). */
  isStructural?: boolean;
}

export type FindingType = 'hidden' | 'unicode-invisible' | 'suspicious-keyword' | 'covert-instruction';

export type FindingSeverity = 'high' | 'medium' | 'low';

export interface Finding {
  id: string;
  type: FindingType;
  severity: FindingSeverity;
  icon: string;
  label: string;
  description: string;
  segmentId: string;
  /** Offsets into the owning segment's text. */
  start: number;
  end: number;
  matchedText: string;
  /** unicode-invisible only: whether this character may be replaced with a space (vs. deleted) when cleaning. */
  actsAsSeparator?: boolean;
}

export interface AnalysisInput {
  text: string;
  html?: string;
}

export interface AnalysisStats {
  hidden: number;
  invisibleUnicode: number;
  suspiciousKeyword: number;
  covertInstruction: number;
  total: number;
}

export interface AnalysisResult {
  input: AnalysisInput;
  segments: Segment[];
  findings: Finding[];
  stats: AnalysisStats;
}

/**
 * Shape returned by the server-side AI deep scan (packages/ai's
 * scanForCovertInstructions, called by the web app's /api/scan-covert
 * route). Defined here — not in a browser-fetch module — so this pure
 * package has no dependency on how any particular app calls the scan.
 */
export interface AIFinding {
  quote: string;
  label: string;
  reason: string;
  category: 'covert-instruction' | 'suspicious-keyword';
}

/**
 * Finding types whose matched content is safe to strip from the clean version:
 * objectively hidden/invisible content, and covert instructions aimed at
 * manipulating an AI reader (e.g. "randomly include the word X 3 times").
 * Ordinary suspicious-keyword findings are intentionally excluded — a keyword
 * being suspicious is not a reason to delete visible content.
 */
export const CLEANABLE_FINDINGS: FindingType[] = ['hidden', 'unicode-invisible', 'covert-instruction'];
