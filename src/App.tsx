import { useMemo, useState } from 'react';
import type { ClipboardEvent, ChangeEvent } from 'react';
import './App.css';
import { analyze } from './lib/analyzer';
import { createCleanVersion } from './lib/cleaner';
import type { AnalysisResult } from './lib/types';
import AnalyzedOutput from './components/AnalyzedOutput';
import FindingsList from './components/FindingsList';
import CopyCleanButton from './components/CopyCleanButton';

const PLACEHOLDER = `Paste text or rich content here to scan it for:

- Hidden or invisible content (display:none, visibility:hidden, opacity:0)
- Invisible/suspicious Unicode characters (zero-width spaces, bidi overrides, hidden Unicode "tags")
- Suspicious phrases (prompt-injection language, credential phishing, urgency scams)

Everything runs locally in your browser. Nothing is sent to a server.`;

function App() {
  const [rawText, setRawText] = useState('');
  const [pastedHtml, setPastedHtml] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const cleanText = useMemo(() => (result ? createCleanVersion(result) : ''), [result]);

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const html = e.clipboardData.getData('text/html');
    setPastedHtml(html && html.trim() ? html : undefined);
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const inputType = (e.nativeEvent as InputEvent).inputType;
    if (inputType !== 'insertFromPaste') {
      setPastedHtml(undefined);
    }
    setRawText(e.target.value);
    setResult(null);
  }

  function handleAnalyze() {
    setResult(analyze({ text: rawText, html: pastedHtml }));
    setShowPreview(false);
  }

  function handleClear() {
    setRawText('');
    setPastedHtml(undefined);
    setResult(null);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Hidden Text &amp; Content Scanner</h1>
        <p>Paste → Analyze → See what's hidden → Copy a clean version. Runs entirely client-side.</p>
      </header>

      <div className="panel">
        <textarea
          className="input-area"
          value={rawText}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder={PLACEHOLDER}
          spellCheck={false}
        />
        <div className="toolbar">
          <button type="button" className="btn btn-primary" onClick={handleAnalyze} disabled={!rawText.trim()}>
            Analyze
          </button>
          <button type="button" className="btn" onClick={handleClear} disabled={!rawText && !result}>
            Clear
          </button>
          {pastedHtml && <span className="hint hint--html">Rich-text/HTML clipboard content detected</span>}
        </div>
      </div>

      {result && (
        <div className="panel">
          <div className="panel-header">
            <span>Analysis Results</span>
            <div className="stats-row">
              {result.stats.hidden > 0 && (
                <span className="stat-chip stat-chip--hidden">🔴 {result.stats.hidden} hidden</span>
              )}
              {result.stats.covertInstruction > 0 && (
                <span className="stat-chip stat-chip--covert">⚠️ {result.stats.covertInstruction} covert instruction{result.stats.covertInstruction === 1 ? '' : 's'}</span>
              )}
              {result.stats.invisibleUnicode > 0 && (
                <span className="stat-chip stat-chip--unicode">🟣 {result.stats.invisibleUnicode} invisible unicode</span>
              )}
              {result.stats.suspiciousKeyword > 0 && (
                <span className="stat-chip stat-chip--keyword">🟠 {result.stats.suspiciousKeyword} suspicious</span>
              )}
              {result.stats.total === 0 && <span className="stat-chip stat-chip--clean">✓ clean</span>}
            </div>
          </div>

          <AnalyzedOutput result={result} />

          <div className="panel-header">
            <span>{result.stats.total} finding{result.stats.total === 1 ? '' : 's'} detected</span>
          </div>
          <FindingsList findings={result.findings} />

          <div className="copy-bar">
            <CopyCleanButton cleanText={cleanText} />
            <button type="button" className="toggle-link" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? 'Hide clean version preview' : 'Preview clean version'}
            </button>
            <p>The original analyzed content above is never changed — the clean version is a separate copy.</p>
          </div>

          {showPreview && (
            <div className="clean-preview">
              <textarea readOnly value={cleanText} onFocus={(e) => e.currentTarget.select()} />
            </div>
          )}
        </div>
      )}

      <p className="footnote">No content ever leaves your browser. This tool exposes hidden content — it does not censor visible content.</p>
    </div>
  );
}

export default App;
