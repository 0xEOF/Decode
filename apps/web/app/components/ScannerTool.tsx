'use client';

import { useMemo, useRef, useState } from 'react';
import type { ClipboardEvent, ChangeEvent, FormEvent } from 'react';
import { analyze, createCleanVersion, flattenVisibleText, mergeAIFindings } from '@decode/content-scanner';
import type { AnalysisResult, Finding } from '@decode/content-scanner';
import { scanWithAI } from '../../lib/aiScan';
import { generateSafePromptRequest, SafePromptError } from '../../lib/safePrompt';
import AnalyzedOutput from './AnalyzedOutput';
import FindingsList from './FindingsList';
import CopyButton from './CopyButton';

function summarizeFindings(findings: Finding[]): string[] {
  return findings.map((f) => {
    const quote = f.matchedText.length > 100 ? `${f.matchedText.slice(0, 100)}…` : f.matchedText;
    return `${f.label}: "${quote}"`;
  });
}

const PLACEHOLDER = `Paste text or rich content here to scan it for:

- Hidden or invisible content (display:none, visibility:hidden, opacity:0)
- Invisible/suspicious Unicode characters (zero-width spaces, bidi overrides, hidden Unicode "tags")
- Suspicious phrases and covert AI-directed instructions (checked locally, then with an AI deep scan)

Hidden/invisible-content checks run instantly in your browser. The visible text is also sent to our
server for an AI deep scan that catches paraphrased covert instructions a fixed pattern list would miss.`;

export default function ScannerTool() {
  const [rawText, setRawText] = useState('');
  const [pastedHtml, setPastedHtml] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isDeepScanning, setIsDeepScanning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [task, setTask] = useState('');
  const [requirements, setRequirements] = useState('');
  const [safePrompt, setSafePrompt] = useState<string | null>(null);
  const [showSafePromptPreview, setShowSafePromptPreview] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [safePromptError, setSafePromptError] = useState<string | null>(null);
  const promptAbortRef = useRef<AbortController | null>(null);

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

  async function handleAnalyze() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const local = analyze({ text: rawText, html: pastedHtml });
    setResult(local);
    setShowPreview(false);
    setAiError(null);
    setIsDeepScanning(true);

    try {
      const { blob } = flattenVisibleText(local.segments);
      const aiFindings = await scanWithAI(blob, controller.signal);
      if (controller.signal.aborted) return;
      setResult(mergeAIFindings(local, aiFindings));
    } catch (err) {
      if (controller.signal.aborted) return;
      setAiError(err instanceof Error ? err.message : 'AI deep scan unavailable — showing local results only.');
    } finally {
      if (!controller.signal.aborted) setIsDeepScanning(false);
    }
  }

  function handleClear() {
    abortRef.current?.abort();
    promptAbortRef.current?.abort();
    setRawText('');
    setPastedHtml(undefined);
    setResult(null);
    setAiError(null);
    setIsDeepScanning(false);
    setTask('');
    setRequirements('');
    setSafePrompt(null);
    setShowSafePromptPreview(false);
    setSafePromptError(null);
  }

  async function handleGenerateSafePrompt(e: FormEvent) {
    e.preventDefault();
    if (!result || !task.trim()) return;

    promptAbortRef.current?.abort();
    const controller = new AbortController();
    promptAbortRef.current = controller;

    setIsGeneratingPrompt(true);
    setSafePromptError(null);
    setSafePrompt(null);

    try {
      const prompt = await generateSafePromptRequest(
        {
          task,
          requirements: requirements.trim() || undefined,
          findingsSummary: summarizeFindings(result.findings),
          cleanText,
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setSafePrompt(prompt);
      setShowSafePromptPreview(true);
    } catch (err) {
      if (controller.signal.aborted) return;
      setSafePromptError(err instanceof SafePromptError ? err.message : 'Safe prompt generation failed.');
    } finally {
      if (!controller.signal.aborted) setIsGeneratingPrompt(false);
    }
  }

  return (
    <>
      <div className="panel">
        <label htmlFor="scan-input" className="sr-only">
          Text to scan for hidden content
        </label>
        <textarea
          id="scan-input"
          className="input-area"
          value={rawText}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder={PLACEHOLDER}
          spellCheck={false}
        />
        <div className="toolbar">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAnalyze}
            disabled={!rawText.trim() || isDeepScanning}
          >
            {isDeepScanning ? 'Analyzing…' : 'Analyze'}
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
                <span className="stat-chip stat-chip--covert">
                  ⚠️ {result.stats.covertInstruction} covert instruction{result.stats.covertInstruction === 1 ? '' : 's'}
                </span>
              )}
              {result.stats.invisibleUnicode > 0 && (
                <span className="stat-chip stat-chip--unicode">
                  🟣 {result.stats.invisibleUnicode} invisible unicode
                </span>
              )}
              {result.stats.suspiciousKeyword > 0 && (
                <span className="stat-chip stat-chip--keyword">🟠 {result.stats.suspiciousKeyword} suspicious</span>
              )}
              {result.stats.total === 0 && !isDeepScanning && (
                <span className="stat-chip stat-chip--clean">✓ clean</span>
              )}
              {isDeepScanning && <span className="stat-chip stat-chip--scanning">🔎 running AI deep scan…</span>}
            </div>
          </div>

          {aiError && (
            <div className="ai-error-banner">
              AI deep scan unavailable — showing local checks only. <span>{aiError}</span>
            </div>
          )}

          <AnalyzedOutput result={result} />

          <div className="panel-header">
            <span>
              {result.stats.total} finding{result.stats.total === 1 ? '' : 's'} detected
            </span>
          </div>
          <FindingsList findings={result.findings} />

          <div className="copy-bar">
            <CopyButton text={cleanText} idleLabel="Copy Clean Version" />
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

          <div className="panel-header">
            <span>Safe Prompt for Any AI</span>
          </div>
          <form className="safe-prompt-form" onSubmit={handleGenerateSafePrompt}>
            <p className="safe-prompt-hint">
              Get a ready-to-paste prompt for ChatGPT, Claude, or any AI assistant — it frames your task and any
              requirements, adapted to what this looks like, and tells the assistant to treat the content below as
              data, not instructions.
            </p>
            <label htmlFor="safe-prompt-task" className="sr-only">
              What do you want the AI to do?
            </label>
            <input
              id="safe-prompt-task"
              type="text"
              className="safe-prompt-task-input"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="What do you want the AI to do? e.g. Grade this essay"
              required
            />
            <label htmlFor="safe-prompt-requirements" className="sr-only">
              Requirements or grading criteria (optional)
            </label>
            <textarea
              id="safe-prompt-requirements"
              className="safe-prompt-requirements-input"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Requirements or grading criteria (optional) — paste a rubric, checklist, or instructions"
            />
            <button type="submit" className="btn btn-primary" disabled={!task.trim() || isGeneratingPrompt}>
              {isGeneratingPrompt ? 'Generating…' : 'Generate Safe Prompt'}
            </button>
          </form>

          {safePromptError && <div className="ai-error-banner">{safePromptError}</div>}

          {safePrompt && (
            <>
              <div className="copy-bar">
                <CopyButton text={safePrompt} idleLabel="Copy Safe Prompt" />
                <button type="button" className="toggle-link" onClick={() => setShowSafePromptPreview((v) => !v)}>
                  {showSafePromptPreview ? 'Hide prompt preview' : 'Preview prompt'}
                </button>
              </div>
              {showSafePromptPreview && (
                <div className="clean-preview">
                  <textarea readOnly value={safePrompt} onFocus={(e) => e.currentTarget.select()} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
