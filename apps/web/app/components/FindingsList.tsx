import type { Finding } from '@decode/content-scanner';

interface Props {
  findings: Finding[];
}

export default function FindingsList({ findings }: Props) {
  if (findings.length === 0) {
    return <div className="empty-state">No hidden, invisible, or suspicious content detected.</div>;
  }

  return (
    <ul className="findings-list">
      {findings.map((finding) => (
        <li key={finding.id} className="finding">
          <span className="finding-icon">{finding.icon}</span>
          <div>
            <div className="finding-label">{finding.label}</div>
            <div className="finding-desc">{finding.description}</div>
            {finding.type !== 'unicode-invisible' && finding.matchedText.trim() && (
              <span className="finding-quote">{finding.matchedText.trim()}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
