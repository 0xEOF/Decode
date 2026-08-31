import type { ReactNode } from 'react';
import type { AnalysisResult, Finding, Segment } from '@decode/content-scanner';

function renderInlineFindings(text: string, findings: Finding[]): ReactNode[] {
  const sorted = [...findings].sort((a, b) => a.start - b.start);
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const finding of sorted) {
    if (finding.start < cursor) continue;
    if (finding.start > cursor) nodes.push(text.slice(cursor, finding.start));

    if (finding.type === 'unicode-invisible') {
      nodes.push(
        <mark key={finding.id} className="mark--unicode" title={finding.description}>
          🟣
        </mark>,
      );
    } else if (finding.type === 'suspicious-keyword') {
      nodes.push(
        <mark key={finding.id} className="mark--keyword" title={finding.description}>
          {text.slice(finding.start, finding.end)}
        </mark>,
      );
    } else if (finding.type === 'covert-instruction') {
      nodes.push(
        <mark key={finding.id} className="mark--covert" title={finding.description}>
          {text.slice(finding.start, finding.end)}
        </mark>,
      );
    }
    cursor = finding.end;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function renderSegment(segment: Segment, findings: Finding[]): ReactNode {
  if (segment.isStructural) {
    return segment.text;
  }
  if (segment.hidden) {
    return (
      <mark
        key={segment.id}
        className="mark--hidden"
        title={segment.hiddenReasons.length ? segment.hiddenReasons.join(', ') : 'hidden'}
      >
        🔴 {segment.text}
      </mark>
    );
  }
  return <span key={segment.id}>{renderInlineFindings(segment.text, findings)}</span>;
}

interface Props {
  result: AnalysisResult;
}

export default function AnalyzedOutput({ result }: Props) {
  const findingsBySegment = new Map<string, Finding[]>();
  for (const finding of result.findings) {
    if (finding.type === 'hidden') continue; // rendered via segment.hidden itself
    const list = findingsBySegment.get(finding.segmentId) ?? [];
    list.push(finding);
    findingsBySegment.set(finding.segmentId, list);
  }

  return (
    <div className="analyzed-output">
      {result.segments.map((segment) => (
        <span key={segment.id}>{renderSegment(segment, findingsBySegment.get(segment.id) ?? [])}</span>
      ))}
    </div>
  );
}
